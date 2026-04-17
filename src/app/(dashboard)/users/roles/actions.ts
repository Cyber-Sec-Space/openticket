"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { hasPermission } from "@/lib/auth-utils"
import { Permission } from "@prisma/client"

// Verify granular Admin Privileges
async function verifyAdmin(action: 'CREATE_ROLES' | 'UPDATE_ROLES' | 'DELETE_ROLES') {
  const session = await auth()
  if (!session?.user || !hasPermission(session as any, action)) {
    throw new Error(`Unauthorized: You lack the ${action} capability.`)
  }
  return session
}

function enforcePrivilegeSubset(session: any, requestedPermissions: Permission[]) {
  // Phase 13 Fix: NextAuth JWT adapter maps customRoles -> string[] 'permissions' at login.
  // Using the original relation path (session.user.customRoles) evaluates to undefined, artificially blocking root.
  const callerPerms = new Set(session.user?.permissions || []);
  
  // System Administrators bypass the constraint
  const isRoot = callerPerms.has('UPDATE_SYSTEM_SETTINGS');
  if (isRoot) return;
  
  // A user cannot mint a role containing privileges they do not actively possess.
  for (const perm of requestedPermissions) {
    if (!callerPerms.has(perm)) {
      throw new Error(`Privilege Escalation Blocked: You cannot delegate privileges you do not possess (${perm}).`);
    }
  }
}

export async function createRole(formData: FormData) {
  const session = await verifyAdmin('CREATE_ROLES')

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const permissionIds = formData.getAll("permissions") as Permission[]

  enforcePrivilegeSubset(session, permissionIds)

  if (!name) throw new Error("Role name is required")

  try {
    const newRole = await db.customRole.create({
      data: {
        name,
        description,
        isSystem: false,
        permissions: permissionIds
      }
    })
    
    await db.auditLog.create({
      data: {
        action: "CREATE",
        entityType: "ROLE",
        entityId: newRole.id,
        userId: session.user.id,
        changes: { details: `Role '${name}' created with ${permissionIds.length} permissions.` }
      }
    })
    
    revalidatePath("/users/roles")
    return { success: true }
  } catch (err: any) {
    throw new Error(err.message || "Failed to create role")
  }
}

export async function updateRole(formData: FormData) {
  const session = await verifyAdmin('UPDATE_ROLES')

  const id = formData.get("id") as string
  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const permissionIds = formData.getAll("permissions") as Permission[]
  
  enforcePrivilegeSubset(session, permissionIds)

  const existingRole = await db.customRole.findUnique({ where: { id } })
  if (!existingRole) throw new Error("Role not found")
  if (existingRole.isSystem) throw new Error("System roles cannot be modified")

  try {
    const updatedRole = await db.customRole.update({
      where: { id },
      data: {
        name,
        description,
        permissions: permissionIds
      }
    })
    
    await db.auditLog.create({
      data: {
        action: "UPDATE",
        entityType: "ROLE",
        entityId: id,
        userId: session.user.id,
        changes: { details: `Role '${name}' updated with ${permissionIds.length} permissions.` }
      }
    })
    
    revalidatePath("/users/roles")
    return { success: true }
  } catch (err: any) {
    throw new Error(err.message || "Failed to update role")
  }
}

export async function deleteRole(formData: FormData) {
  const session = await verifyAdmin('DELETE_ROLES')

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
     
     await tx.auditLog.create({
       data: {
         action: "DELETE",
         entityType: "ROLE",
         entityId: id,
         userId: session?.user?.id || "system",
         changes: { details: `Role '${existingRole.name}' deleted. Users reassigned to fallback role if applicable.` }
       }
     })
  })

  revalidatePath("/users/roles")
  revalidatePath("/users")
}
