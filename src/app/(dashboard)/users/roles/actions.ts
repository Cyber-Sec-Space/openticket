"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { hasPermission } from "@/lib/auth-utils"
import { Permission } from "@prisma/client"

// Verify Admin Privileges (SYSTEM_SETTINGS)
async function verifyAdmin() {
  const session = await auth()
  if (!session?.user || !hasPermission(session as any, 'MANAGE_USER_ROLES')) {
    throw new Error("Unauthorized: Only Administrators can modify roles.")
  }
}

export async function createRole(formData: FormData) {
  await verifyAdmin()

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const permissionIds = formData.getAll("permissions") as Permission[]

  if (!name) throw new Error("Role name is required")

  try {
    await db.customRole.create({
      data: {
        name,
        description,
        isSystem: false,
        permissions: permissionIds
      }
    })
    revalidatePath("/users/roles")
    return { success: true }
  } catch (err: any) {
    throw new Error(err.message || "Failed to create role")
  }
}

export async function updateRole(formData: FormData) {
  await verifyAdmin()

  const id = formData.get("id") as string
  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const permissionIds = formData.getAll("permissions") as Permission[]

  const existingRole = await db.customRole.findUnique({ where: { id } })
  if (!existingRole) throw new Error("Role not found")
  if (existingRole.isSystem) throw new Error("System roles cannot be modified")

  try {
    await db.customRole.update({
      where: { id },
      data: {
        name,
        description,
        permissions: permissionIds
      }
    })
    revalidatePath("/users/roles")
    return { success: true }
  } catch (err: any) {
    throw new Error(err.message || "Failed to update role")
  }
}

export async function deleteRole(formData: FormData) {
  await verifyAdmin()

  const id = formData.get("id") as string
  
  const existingRole = await db.customRole.findUnique({ 
    where: { id },
    include: { users: { select: { id: true } } }
  })
  
  if (!existingRole) throw new Error("Role not found")
  if (existingRole.isSystem) throw new Error("System roles cannot be deleted")

  // The user requested: if a user loses all roles, fall back to "Standard Reporter (System)"
  // Fetch the authoritative fallback role defined in global System Settings
  const settings = await db.systemSetting.findUnique({
      where: { id: "global" },
      include: { defaultUserRoles: true }
  })
  const fallbackRole = settings?.defaultUserRoles?.[0] || null

  // We should do this in a transaction:
  await db.$transaction(async (tx) => {
     // 1. Get all users who have THIS role
     const usersToCheck = await tx.user.findMany({
         where: { customRoles: { some: { id } } },
         include: { customRoles: { select: { id: true } } }
     })

     // 2. Disconnect role from users (done automatically by cascade / delete below)
     // 3. For any user who ONLY had this ONE role, grant them the fallback role
     for (const user of usersToCheck) {
         if (user.customRoles.length === 1 && fallbackRole) { // Note: 1 because it hasn't been deleted yet
            await tx.user.update({
                where: { id: user.id },
                data: {
                    customRoles: {
                        connect: { id: fallbackRole.id }
                    }
                }
            })
         }
     }

     // 4. Finally delete the role entirely
     await tx.customRole.delete({ where: { id } })
  })

  revalidatePath("/users/roles")
  revalidatePath("/users")
}
