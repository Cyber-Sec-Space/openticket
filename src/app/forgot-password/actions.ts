"use server"

import { db } from "@/lib/db"
import crypto from "crypto"
import { sendPasswordResetEmail } from "@/lib/mailer"

export async function sendResetLink(prevState: any, formData: FormData) {
  const email = formData.get("email") as string
  if (!email) return { error: "Structural Validation Error: Missing identity route" }

  const settings = await db.systemSetting.findUnique({ where: { id: "global" } })
  if (!settings?.smtpEnabled || settings?.allowPasswordReset === false) {
    return { error: "Operational Fault: Password recovery subsystem offline or disabled." }
  }

  const startTime = Date.now()
  
  const user = await db.user.findUnique({ where: { email } })
  
  // Generate crypto token regardless of user existence to pad CPU time
  const resetToken = crypto.randomBytes(32).toString("hex")

  if (!user) {
    // Return early but pad with absolute maximum network time limit
    const elapsed = Date.now() - startTime
    if (elapsed < 2000) {
      await new Promise(resolve => setTimeout(resolve, 2000 - elapsed))
    }
    return { success: true }
  }
  
  // Wipe previous tokens if any to prevent clutter/re-use window extensions and create new token atomically
  await db.$transaction([
    db.passwordResetToken.deleteMany({ where: { email } }),
    db.passwordResetToken.create({
      data: {
        email,
        token: resetToken,
        expires: new Date(Date.now() + 1000 * 60 * 15) // Strictly 15 minutes window
      }
    })
  ])

  // Transmit payload
  const tokenUrl = `${settings.systemPlatformUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`
  await sendPasswordResetEmail(email, tokenUrl)
  
  await db.auditLog.create({
    data: {
      action: "CREATE",
      entityType: "USER",
      entityId: user.id,
      userId: user.id,
      changes: { details: "Password reset sequence initiated. Security payload transmitted." }
    }
  })

  // Absolute Timing Padding to mask Network I/O
  const elapsed = Date.now() - startTime
  if (elapsed < 2000) {
    await new Promise(resolve => setTimeout(resolve, 2000 - elapsed))
  }

  return { success: true }
}
