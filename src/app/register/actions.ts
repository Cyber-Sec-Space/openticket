"use server"

import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"
import { sendNewRegistrationAlertEmail, sendVerificationEmail } from "@/lib/mailer"
import crypto from "crypto"

const BCRYPT_COST = 12

export async function attemptRegistration(prevState: any, formData: FormData) {
  const settings = await db.systemSetting.findUnique({ where: { id: "global" }, include: { defaultUserRoles: true } })
  const allowRegistration = settings?.allowRegistration ?? true

  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const inviteToken = formData.get("inviteToken") as string | null

  if (!email || !password || !name) {
    return "MISSING_FIELDS"
  }
  
  if (password.length < 8) {
    return "PASSWORD_TOO_SHORT"
  }

  if (password.length > 72) {
    return "PASSWORD_TOO_LONG"
  }

  // Anti-bruteforce / Anti-enumeration delay (Constant time mitigation)
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));

  let invitationRecord: any = null
  if (inviteToken) {
    invitationRecord = await db.invitation.findUnique({ where: { token: inviteToken } })
    if (!invitationRecord || invitationRecord.expiresAt < new Date()) {
      return "REGISTRATION_FAILED" // Invalid or expired token
    }
    if (invitationRecord.email && invitationRecord.email.toLowerCase() !== email.toLowerCase()) {
      return "REGISTRATION_FAILED" // Email hijacked
    }
  } else if (!allowRegistration) {
     return "REGISTRATION_DISABLED"
  }

  const existingUser = await db.user.findUnique({ where: { email } })
  
  // Enforce constant-time execution to prevent timing-based Account Enumeration
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST)

  if (existingUser) {
    // SECURITY: We pretend it failed normally AFTER spending the bcrypt CPU cycles
    return "REGISTRATION_FAILED"
  }
  
  let verificationToken: string | null = null;
  if (settings?.requireEmailVerification && settings?.smtpEnabled) {
    verificationToken = crypto.randomBytes(32).toString("hex")
  }

  try {
    const defaultRoles = (settings && settings.defaultUserRoles && settings.defaultUserRoles.length > 0) 
      ? { connect: settings.defaultUserRoles.map(r => ({ id: r.id })) } 
      : undefined

    await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          customRoles: defaultRoles
        }
      })
      if (inviteToken) {
        await tx.invitation.delete({ where: { token: inviteToken } })
      }
      
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "USER",
          entityId: newUser.id,
          userId: newUser.id, // Self-created
          changes: { details: `New user account registered${inviteToken ? ' via invitation token' : ''}.` }
        }
      })

      if (verificationToken) {
        await tx.verificationToken.create({
          data: {
            identifier: email,
            token: verificationToken,
            expires: new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours
          }
        })
      }
    })
  } catch (error: any) {
    if (error.code === 'P2002' || error.code === 'P2025') {
      // P2002 is Unique constraint failed (User email)
      // P2025 is Record to delete does not exist (Token already consumed - TOCTOU prevented)
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
  if (verificationToken) {
    const tokenUrl = `${settings?.systemPlatformUrl || "http://localhost:3000"}/api/auth/verify?token=${verificationToken}&email=${encodeURIComponent(email)}`
    await sendVerificationEmail(email, name, tokenUrl)
    redirect("/login?registered=verify")
  }

  redirect("/login?registered=true")
}
