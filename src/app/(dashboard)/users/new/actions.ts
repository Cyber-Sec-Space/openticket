"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import bcrypt from "bcrypt"
import { sendNewRegistrationAlertEmail } from "@/lib/mailer"
import { hasPermission } from "@/lib/auth-utils"
import { getGlobalSettings } from "@/lib/settings";

export async function createUserAction(formData: FormData) {
  const session = await auth()
  
  if (!session?.user || !hasPermission(session as any, 'CREATE_USERS')) {
    throw new Error("Forbidden: Strict Access Control")
  }

  const email = formData.get("email") as string
  const name = formData.get("name") as string
  const password = formData.get("password") as string
  const customRoleIds = formData.getAll("customRoleIds") as string[]

  if (!email || !password || !name) {
    throw new Error("Validation structural error: missing foundational identity markers.")
  }

  // CVE-407 DoS Mitigation: Bcrypt CPU Starvation block
  if (password.length > 72) {
    throw new Error("Input Boundary Violation: Password length exceeds secure cryptographic maximums (72 bytes).")
  }
  if (email.length > 255 || name.length > 255) {
    throw new Error("Input Boundary Violation: Identity fields exceed maximum length.")
  }

  // Check if user already exists
  const existingUser = await db.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    throw new Error(`Email proxy [${email}] is already bound to an active identity map.`)
  }

  // Execute 10-round salted hash
  const passwordHash = await bcrypt.hash(password, 12)

  // Phase 12: God-Mode Forging Mitigation
  const settings = await db.systemSetting.findUnique({ 
    where: { id: "global" },
    include: { defaultUserRoles: true }
  })
  
  let finalRoleIds: string[] = []
  
  if (customRoleIds.length > 0 && hasPermission(session as any, 'ASSIGN_USER_ROLES')) {
     const hasRoot = hasPermission(session as any, 'UPDATE_SYSTEM_SETTINGS')
     if (!hasRoot) {
       // Validate Subset Integrity
       const targetRoles = await db.customRole.findMany({ where: { id: { in: customRoleIds } } })
       const callerPerms = new Set((session as any).user?.permissions || [])
       let isSubset = true
       for (const role of targetRoles) {
         for (const perm of role.permissions) {
           if (!callerPerms.has(perm)) isSubset = false
         }
       }
       if (!isSubset) {
         throw new Error("Forbidden: Cannot assign roles containing privileges beyond your own clearance.")
       }
     }
     finalRoleIds = customRoleIds
  } else {
     // Fallback to System Defaults if they lack ASSIGN_USER_ROLES or didn't provide any map
     finalRoleIds = settings?.defaultUserRoles?.map(r => r.id) || []
  }

  const newUser = await db.user.create({
    data: {
      email,
      name,
      passwordHash,
      customRoles: finalRoleIds.length > 0 ? { connect: finalRoleIds.map(id => ({ id })) } : undefined
    }
  })

  const { fireHook } = await import("@/lib/plugins/hook-engine");
  await fireHook("onUserCreated", newUser);

  // Telemetry Audit log hook
  await db.auditLog.create({
    data: {
      action: "USER_CREATED",
      entityType: "User",
      entityId: newUser.id,
      userId: session.user.id,
      changes: `Minted new Identity Record [${email}]`
    }
  })

  // Phase 10: Email Alert on New Registration
  if (settings?.smtpTriggerOnNewUser) {
    const admins = await db.user.findMany({ where: { customRoles: { some: { permissions: { has: 'UPDATE_SYSTEM_SETTINGS' } } }, email: { not: null }, id: { not: newUser.id } }, select: { email: true } })
    await sendNewRegistrationAlertEmail(email, name, admins.map(a => a.email as string))
  }

  revalidatePath("/users")
  redirect("/users")
}
