"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"
import { sendNewRegistrationAlertEmail } from "@/lib/mailer"
import { hasPermission } from "@/lib/auth-utils"

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

  // Check if user already exists
  const existingUser = await db.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    throw new Error(`Email proxy [${email}] is already bound to an active identity map.`)
  }

  // Execute 10-round salted hash
  const passwordHash = await bcrypt.hash(password, 12)

  const newUser = await db.user.create({
    data: {
      email,
      name,
      passwordHash,
      customRoles: customRoleIds.length > 0 ? { connect: customRoleIds.map(id => ({ id })) } : undefined
    }
  })

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
  const settings = await db.systemSetting.findUnique({ where: { id: "global" } })
  if (settings?.smtpTriggerOnNewUser) {
    const admins = await db.user.findMany({ where: { customRoles: { some: { permissions: { has: 'UPDATE_SYSTEM_SETTINGS' } } }, email: { not: null }, id: { not: newUser.id } }, select: { email: true } })
    await sendNewRegistrationAlertEmail(email, name, admins.map(a => a.email as string))
  }

  revalidatePath("/users")
  redirect("/users")
}
