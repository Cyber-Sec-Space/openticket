"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { hasPermission } from "@/lib/auth-utils"

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
  if (!session?.user || !hasPermission(session as any, 'ASSIGN_USER_ROLES')) {
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
  
  if (!session?.user || !hasPermission(session as any, 'DELETE_USERS')) {
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
}

export async function toggleUserStatusAction(userId: string, isDisabled: boolean) {
  const session = await auth()
  
  if (!session?.user || !hasPermission(session as any, 'SUSPEND_USERS')) {
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
  
  if (!session?.user || !hasPermission(session as any, 'DELETE_USERS')) {
    throw new Error("Forbidden: Strict Access Control")
  }

  // Prevent self-deletion in bulk
  const safeUserIds = userIds.filter(id => id !== session.user.id)
  if (safeUserIds.length === 0) return

  await verifyTargetHeightAndSubset(session, safeUserIds);

  await db.user.deleteMany({
    where: { id: { in: safeUserIds } }
  })

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
  
  if (!session?.user || !hasPermission(session as any, 'ASSIGN_USER_ROLES')) {
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
