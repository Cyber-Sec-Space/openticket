"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { hasPermission } from "@/lib/auth-utils"
import crypto from "crypto"
import bcrypt from "bcrypt"
import { sendPasswordResetEmail } from "@/lib/mailer"
import { getGlobalSettings } from "@/lib/settings"

function generateSecureTempPassword(): string {
  // Generate a random 16 character password
  return crypto.randomBytes(12).toString("base64")
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .slice(0, 16);
}

export async function adminResetPasswordAction(targetUserId: string) {
  const session = await auth()
  
  // Enforce RESET_USER_PASSWORDS permission
  if (!session?.user || !hasPermission(session, 'RESET_USER_PASSWORDS')) {
    throw new Error("Forbidden: You lack the RESET_USER_PASSWORDS capability.")
  }

  // Prevent self-reset to avoid lockout via temporary passwords or unmonitored links
  if (session.user.id === targetUserId) {
     throw new Error("Forbidden: You cannot reset your own password via this administrative module.")
  }

  const targetUser = await db.user.findUnique({ where: { id: targetUserId } })
  if (!targetUser) throw new Error("Target user not found")

  const settings = await getGlobalSettings()
  
  if (settings?.smtpEnabled && settings?.allowPasswordReset !== false) {
     // SMTP Mode
     const resetToken = crypto.randomBytes(32).toString("hex")
     
     await db.$transaction([
       db.passwordResetToken.deleteMany({ where: { email: targetUser.email } }),
       db.passwordResetToken.create({
         data: {
           email: targetUser.email,
           token: resetToken,
           expires: new Date(Date.now() + 1000 * 60 * 15) // 15 mins
         }
       }),
       db.auditLog.create({
         data: {
           action: "PASSWORD_RESET_ADMIN",
           entityType: "USER",
           entityId: targetUserId,
           userId: session.user.id,
           changes: { details: "Admin forced a password reset. Reset link transmitted via email." }
         }
       })
     ])

     const tokenUrl = `${settings.systemPlatformUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(targetUser.email)}`
     await sendPasswordResetEmail(targetUser.email, tokenUrl)
     
     return { success: true, mode: 'email' }
  } else {
     // Manual Mode (No SMTP)
     const tempPassword = generateSecureTempPassword()
     const passwordHash = await bcrypt.hash(tempPassword, 12)

     await db.$transaction([
       db.user.update({
         where: { id: targetUserId },
         data: { passwordHash }
       }),
       db.auditLog.create({
         data: {
           action: "PASSWORD_RESET_ADMIN",
           entityType: "USER",
           entityId: targetUserId,
           userId: session.user.id,
           changes: { details: "Admin forced a manual password reset. Temporary password displayed on screen." }
         }
       })
     ])

     return { success: true, mode: 'manual', tempPassword }
  }
}
