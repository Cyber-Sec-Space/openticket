"use server"

import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"
import { sendNewRegistrationAlertEmail, sendVerificationEmail } from "@/lib/mailer"
import crypto from "crypto"

export async function attemptRegistration(prevState: any, formData: FormData) {
  const settings = await db.systemSetting.findUnique({ where: { id: "global" }, include: { defaultUserRoles: true } })
  const allowRegistration = settings?.allowRegistration ?? true

  if (!allowRegistration) {
     return "REGISTRATION_DISABLED"
  }

  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password || !name) {
    return "MISSING_FIELDS"
  }
  
  if (password.length < 8) {
    return "PASSWORD_TOO_SHORT"
  }

  // Anti-bruteforce / Anti-enumeration delay (Constant time mitigation)
  // Regardless of success or failure, we artificially delay the response.
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));

  const existingUser = await db.user.findUnique({ where: { email } })
  
  // Enforce constant-time execution to prevent timing-based Account Enumeration
  const passwordHash = await bcrypt.hash(password, 10)

  if (existingUser) {
    // SECURITY: We pretend it failed normally AFTER spending the bcrypt CPU cycles
    return "REGISTRATION_FAILED"
  }
  
  try {
    await db.user.create({
      data: {
        email,
        name,
        passwordHash,
        customRoles: (settings && settings.defaultUserRoles && settings.defaultUserRoles.length > 0) ? { connect: settings.defaultUserRoles.map(r => ({ id: r.id })) } : undefined
      }
    })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return "REGISTRATION_FAILED"
    }
    throw error // Re-throw unrecognized structural database errors
  }

  // Phase 10: Email Alert on New Registration
  if (settings?.smtpTriggerOnNewUser) {
    const admins = await db.user.findMany({ where: { customRoles: { some: { permissions: { has: 'VIEW_SYSTEM_SETTINGS' } } }, email: { not: null } }, select: { email: true } })
    await sendNewRegistrationAlertEmail(email, name, admins.map(a => a.email as string))
  }

  // Phase 11: Identity Verification
  if (settings?.requireEmailVerification && settings?.smtpEnabled) {
    const verificationToken = crypto.randomBytes(32).toString("hex")
    await db.verificationToken.create({
      data: {
        identifier: email,
        token: verificationToken,
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours
      }
    })
    
    const tokenUrl = `${settings.systemPlatformUrl}/api/auth/verify?token=${verificationToken}&email=${encodeURIComponent(email)}`
    await sendVerificationEmail(email, name, tokenUrl)
    redirect("/login?registered=verify")
  }

  redirect("/login?registered=true")
}
