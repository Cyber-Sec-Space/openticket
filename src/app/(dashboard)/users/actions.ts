"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { hasPermission } from "@/lib/auth-utils"
import { getGlobalSettings } from "@/lib/settings";

// Phase 12 Security: Vertical Privilege Validation
async function verifyTargetHeightAndSubset(executor: any, targetUserIds: string[], roleIds?: string[]) {
  const hasRoot = hasPermission(executor, 'UPDATE_SYSTEM_SETTINGS');
  if (hasRoot) return; // Root bypasses restrictions

  // 1. Target Height Check
  const targets = await db.user.findMany({
    where: { id: { in: targetUserIds } },
    include: { customRoles: true }
  });

  for (const target of targets) {
    for (const role of target.customRoles) {
      if (role.permissions.includes('UPDATE_SYSTEM_SETTINGS')) {
        throw new Error("Forbidden: Target possesses root privileges. You lack UPDATE_SYSTEM_SETTINGS to interact.");
      }
    }
  }

  // 2. Subset Check for requested role assignments
  if (roleIds && roleIds.length > 0) {
    const rolesToAssign = await db.customRole.findMany({ where: { id: { in: roleIds } } })
    const executorPerms = new Set(executor.user?.permissions || [])
    for (const role of rolesToAssign) {
      for (const perm of role.permissions) {
        if (!executorPerms.has(perm)) {
           throw new Error("Forbidden: Cannot assign roles containing privileges beyond your own clearance.");
        }
      }
    }
  }
}

export async function updateUserRole(formData: FormData) {
  const session = await auth()
  
  // Security boundary: Only ASSIGN_USER_ROLES can modify RBAC.
  if (!session?.user || !hasPermission(session, 'ASSIGN_USER_ROLES')) {
    throw new Error("Forbidden: Strict Access Control")
  }

  const targetUserId = formData.get("userId") as string
  const customRoleIds = formData.getAll("customRoleIds") as string[]

  if (!targetUserId || !customRoleIds || customRoleIds.length === 0) return

  // Prevent admin from demoting themselves by accident, optional but safe.
  if (targetUserId === session.user.id) {
     throw new Error("Operation blocked: Administrators cannot modify their own privileges directly.");
  }

  await verifyTargetHeightAndSubset(session, [targetUserId], customRoleIds);

  const updatedUser = await db.user.update({
    where: { id: targetUserId },
    data: { customRoles: { set: customRoleIds.map(id => ({ id })) } }
  })

  const { fireHook } = await import("@/lib/plugins/hook-engine")
  await fireHook("onUserUpdated", updatedUser as any)


  // Log to global audit
  await db.auditLog.create({
    data: {
      action: "USER_ROLE_MODIFIED",
      entityType: "User",
      entityId: targetUserId,
      userId: session.user.id,
      changes: `Roles of ${updatedUser.name || updatedUser.email} completely overwritten`
    }
  })

  revalidatePath("/users")
}

export async function deleteUserAction(formData: FormData) {
  const session = await auth()
  
  if (!session?.user || !hasPermission(session, 'DELETE_USERS')) {
    throw new Error("Forbidden: Strict Access Control")
  }

  const targetUserId = formData.get("userId") as string

  if (!targetUserId) return

  if (targetUserId === session.user.id) {
    throw new Error("Operation blocked: Administrators cannot surgically excise their own root credentials.")
  }

  await verifyTargetHeightAndSubset(session, [targetUserId]);

  const userToDelete = await db.user.findUnique({ where: { id: targetUserId } })
  if (!userToDelete) return;

  await db.user.deleteMany({
    where: { id: targetUserId }
  })

  const { fireHook } = await import("@/lib/plugins/hook-engine")
  await fireHook("onUserDestroyed", targetUserId)


  // Log to global audit
  await db.auditLog.create({
    data: {
      action: "USER_DELETED",
      entityType: "User",
      entityId: targetUserId,
      userId: session.user.id,
      changes: `Identity profile ${userToDelete.email} officially revoked and destroyed.`
    }
  })

  revalidatePath("/users")
  const { redirect } = await import("next/navigation")
  redirect("/users")
}

export async function toggleUserStatusAction(userId: string, isDisabled: boolean) {
  const session = await auth()
  
  if (!session?.user || !hasPermission(session, 'SUSPEND_USERS')) {
    throw new Error("Forbidden: Strict Access Control")
  }

  if (userId === session.user.id) {
    throw new Error("Operation blocked: You cannot suspend your own active session.")
  }

  await verifyTargetHeightAndSubset(session, [userId]);

  const updatedUser = await db.user.update({
    where: { id: userId },
    data: { isDisabled }
  })

  const { fireHook } = await import("@/lib/plugins/hook-engine")
  await fireHook("onUserUpdated", updatedUser as any)


  if (isDisabled) {
    // Forcefully revoke all active JWT/DB sessions implicitly by triggering auth.ts database check 
    // since we do not use native db session tokens for Credentials JWT.
    // If next-auth session database was used: await db.session.deleteMany({ where: { userId } })
  }

  await db.auditLog.create({
    data: {
      action: "USER_STATUS_TOGGLED",
      entityType: "User",
      entityId: userId,
      userId: session.user.id,
      changes: `Account ${updatedUser.email} has been forcefully ${isDisabled ? 'SUSPENDED' : 'REACTIVATED'}`
    }
  })

  revalidatePath("/users")
}

export async function bulkDeleteUsersAction(userIds: string[]) {
  const session = await auth()
  
  if (!session?.user || !hasPermission(session, 'DELETE_USERS')) {
    throw new Error("Forbidden: Strict Access Control")
  }

  // Prevent self-deletion in bulk
  const safeUserIds = userIds.filter(id => id !== session.user.id)
  if (safeUserIds.length === 0) return

  await verifyTargetHeightAndSubset(session, safeUserIds);

  await db.user.deleteMany({
    where: { id: { in: safeUserIds } }
  })

  const { fireHook } = await import("@/lib/plugins/hook-engine")
  for (const uid of safeUserIds) {
    await fireHook("onUserDestroyed", uid)
  }


  await db.auditLog.create({
    data: {
      action: "USERS_BULK_DELETED",
      entityType: "User",
      entityId: "BULK",
      userId: session.user.id,
      changes: `Bulk excised ${safeUserIds.length} users from the system.`
    }
  })

  revalidatePath("/users")
}

export async function bulkUpdateRolesAction(userIds: string[], roleIds: string[]) {
  const session = await auth()
  
  if (!session?.user || !hasPermission(session, 'ASSIGN_USER_ROLES')) {
    throw new Error("Forbidden: Strict Access Control")
  }

  // Prevent self modification
  const finalUserIds = userIds.filter(id => id !== session.user.id)
  
  if (finalUserIds.length === 0) return

  await verifyTargetHeightAndSubset(session, finalUserIds, roleIds);

  // Prisma updateMany doesn't support relations. We must loop and execute sequentially or inside a transaction
  await db.$transaction(
    finalUserIds.map(id => 
      db.user.update({
        where: { id },
        data: { customRoles: { set: roleIds.map(rId => ({ id: rId })) } }
      })
    )
  )

  const { fireHook } = await import("@/lib/plugins/hook-engine")
  for (const uid of finalUserIds) {
    const updated = await db.user.findUnique({ where: { id: uid } })
    if (updated) await fireHook("onUserUpdated", updated as any)
  }


  await db.auditLog.create({
    data: {
      action: "USERS_BULK_ROLE_UPDATED",
      entityType: "User",
      entityId: "BULK",
      userId: session.user.id,
      changes: `Bulk assigned roles to ${finalUserIds.length} users.`
    }
  })

  revalidatePath("/users")
}

export async function createInvitation(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")
  
  if (!hasPermission(session, 'CREATE_USERS')) {
    throw new Error("Insufficient Permissions")
  }

  const emailRaw = formData.get("email") as string
  const email = emailRaw ? emailRaw.trim() : null

  // Rate limiting (max 20 per hour for this user)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const recentCount = await db.invitation.count({
    where: { createdById: session.user.id, createdAt: { gte: oneHourAgo } }
  })
  
  if (recentCount >= 20) {
    throw new Error("Rate limit exceeded. Try again later.")
  }

  const crypto = await import("crypto")
  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours

  await db.invitation.create({
    data: {
      email,
      token,
      expiresAt,
      createdById: session.user.id
    }
  })

  // Get system URL for the link
  const settings = await getGlobalSettings()
  const baseUrl = settings?.systemPlatformUrl || "http://localhost:3000"
  const joinUrl = `${baseUrl}/register?invite=${token}`

  // If email was provided, dispatch email
  if (email && settings?.smtpEnabled) {
    const { sendOperatorInvitationEmail } = await import("@/lib/mailer")
    await sendOperatorInvitationEmail(email, joinUrl, session.user.name || "Unknown")
  }

  await db.auditLog.create({
    data: {
      action: "CREATE",
      entityType: "INVITATION",
      entityId: "new",
      userId: session.user.id,
      changes: { details: `Created a new system invitation link. Sent to email: ${email || "None"}.` }
    }
  });

  return { success: true, joinUrl }
}
