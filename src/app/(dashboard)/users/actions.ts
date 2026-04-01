"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { Role } from "@prisma/client"

export async function updateUserRole(formData: FormData) {
  const session = await auth()
  
  // Security boundary: Only ADMIN can modify RBAC.
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error("Forbidden: Strict Access Control")
  }

  const targetUserId = formData.get("userId") as string
  const newRole = formData.get("role") as Role

  if (!targetUserId || !newRole) return

  // Prevent admin from demoting themselves by accident, optional but safe.
  if (targetUserId === session.user.id && newRole !== 'ADMIN') {
     throw new Error("Operation blocked: Administrators cannot revoke their own root privileges directly.");
  }

  const updatedUser = await db.user.update({
    where: { id: targetUserId },
    data: { role: newRole }
  })

  // Log to global audit
  await db.auditLog.create({
    data: {
      action: "USER_ROLE_MODIFIED",
      entityType: "User",
      entityId: targetUserId,
      userId: session.user.id,
      changes: `Role of ${updatedUser.name || updatedUser.email} escalated/de-escalated to [${newRole}]`
    }
  })

  revalidatePath("/users")
}

export async function deleteUserAction(formData: FormData) {
  const session = await auth()
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error("Forbidden: Strict Access Control")
  }

  const targetUserId = formData.get("userId") as string

  if (!targetUserId) return

  if (targetUserId === session.user.id) {
    throw new Error("Operation blocked: Administrators cannot surgically excise their own root credentials.")
  }

  const deletedUser = await db.user.delete({
    where: { id: targetUserId }
  })

  // Log to global audit
  await db.auditLog.create({
    data: {
      action: "USER_DELETED",
      entityType: "User",
      entityId: targetUserId,
      userId: session.user.id,
      changes: `Identity profile ${deletedUser.email} officially revoked and destroyed.`
    }
  })

  revalidatePath("/users")
}

export async function toggleUserStatusAction(userId: string, isDisabled: boolean) {
  const session = await auth()
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error("Forbidden: Strict Access Control")
  }

  if (userId === session.user.id) {
    throw new Error("Operation blocked: You cannot suspend your own active session.")
  }

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
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error("Forbidden: Strict Access Control")
  }

  // Prevent self-deletion in bulk
  const safeUserIds = userIds.filter(id => id !== session.user.id)
  if (safeUserIds.length === 0) return

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

export async function bulkUpdateRoleAction(userIds: string[], role: Role) {
  const session = await auth()
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error("Forbidden: Strict Access Control")
  }

  // Prevent admin from demoting themselves via bulk
  const finalUserIds = role === 'ADMIN' ? userIds : userIds.filter(id => id !== session.user.id)
  
  if (finalUserIds.length === 0) return

  await db.user.updateMany({
    where: { id: { in: finalUserIds } },
    data: { role }
  })

  await db.auditLog.create({
    data: {
      action: "USERS_BULK_ROLE_UPDATED",
      entityType: "User",
      entityId: "BULK",
      userId: session.user.id,
      changes: `Bulk escalated/demoted ${finalUserIds.length} users to role ${role}.`
    }
  })

  revalidatePath("/users")
}
