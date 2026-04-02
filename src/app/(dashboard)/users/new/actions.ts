"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import bcrypt from "bcrypt"
import { Role } from "@prisma/client"
import { sendNewRegistrationAlertEmail } from "@/lib/mailer"

export async function createUserAction(formData: FormData) {
  const session = await auth()
  
  if (!session?.user || !session.user.roles.includes('ADMIN')) {
    throw new Error("Forbidden: Strict Access Control")
  }

  const email = formData.get("email") as string
  const name = formData.get("name") as string
  const password = formData.get("password") as string
  const newRoles = formData.getAll("roles") as Role[]

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
      roles: newRoles.length > 0 ? newRoles : ['REPORTER']
    }
  })

  // Telemetry Audit log hook
  await db.auditLog.create({
    data: {
      action: "USER_CREATED",
      entityType: "User",
      entityId: newUser.id,
      userId: session.user.id,
      changes: `Minted new Identity Record [${email}] with roles [${newRoles.join(', ')}]`
    }
  })

  // Phase 10: Email Alert on New Registration
  const settings = await db.systemSetting.findUnique({ where: { id: "global" } })
  if (settings?.smtpTriggerOnNewUser) {
    const admins = await db.user.findMany({ where: { roles: { hasSome: ['ADMIN'] }, email: { not: null }, id: { not: newUser.id } }, select: { email: true } })
    await sendNewRegistrationAlertEmail(email, name, admins.map(a => a.email as string))
  }

  revalidatePath("/users")
  redirect("/users")
}
