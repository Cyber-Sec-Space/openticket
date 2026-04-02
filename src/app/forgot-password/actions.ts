"use server"

import { db } from "@/lib/db"
import crypto from "crypto"
import { sendPasswordResetEmail } from "@/lib/mailer"

export async function sendResetLink(prevState: any, formData: FormData) {
  const email = formData.get("email") as string
  if (!email) return { error: "Structural Validation Error: Missing identity route" }

  const settings = await db.systemSetting.findUnique({ where: { id: "global" } })
  if (!settings?.smtpEnabled) {
    return { error: "Operational Fault: SMTP Subsystem Offline." }
  }

  // Artificial constant-time mitigation mechanism to prevent account enumeration
  await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 300))

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    // Return success anyway, preventing enumeration of our Identity Map
    return { success: true }
  }

  // Generate crypto token
  const resetToken = crypto.randomBytes(32).toString("hex")
  
  // Wipe previous tokens if any to prevent clutter/re-use window extensions
  await db.passwordResetToken.deleteMany({ where: { email } })

  await db.passwordResetToken.create({
    data: {
      email,
      token: resetToken,
      expires: new Date(Date.now() + 1000 * 60 * 15) // Strictly 15 minutes window
    }
  })

  // Transmit payload
  const tokenUrl = `${settings.systemPlatformUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`
  await sendPasswordResetEmail(email, tokenUrl)

  return { success: true }
}
