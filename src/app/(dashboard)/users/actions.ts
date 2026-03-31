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
