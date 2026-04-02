"use server"

import { db } from "@/lib/db"
import bcrypt from "bcrypt"

export async function executeReset(prevState: any, formData: FormData) {
  const token = formData.get("token") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (!token || !email || !password || !confirmPassword) {
    return { error: "Validation Protocol Error: Incomplete Payload." }
  }

  if (password !== confirmPassword) {
    return { error: "Hash Mismatch: Private Keys do not align." }
  }

  if (password.length < 8) {
    return { error: "Entropy Constraint: Private Key structurally insufficient." }
  }

  // Artificial delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400))

  const resetData = await db.passwordResetToken.findUnique({
    where: { email_token: { email, token } }
  })

  if (!resetData) {
    return { error: "Authentication Failure: Sequence unrecognized." }
  }

  if (new Date() > resetData.expires) {
    return { error: "Temporal Desync: Reset link has expired." }
  }

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    return { error: "Phantom State: Operator no longer exists." }
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(password, 12)

  // Atomic update
  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { passwordHash }
    }),
    db.passwordResetToken.delete({
      where: { id: resetData.id }
    }),
    // Create an audit trail strictly for SOC
    db.auditLog.create({
      data: {
         action: "PASSWORD_OVERRIDE",
         entityType: "User",
         entityId: user.id,
         userId: user.id,
         changes: `Operator executed an out-of-band credential reset via SMTP token linkage.`
      }
    })
  ])

  return { success: true }
}
