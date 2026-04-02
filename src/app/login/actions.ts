"use server"

import { signIn } from "@/auth"
import { AuthError } from "next-auth"
import { db } from "@/lib/db"
import { headers } from "next/headers"

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  const reqHeaders = await headers()
  const ip = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || 'unknown-ip'
  const email = formData.get('email') as string || 'unknown-email'

  const settings = await db.systemSetting.findUnique({ where: { id: "global" } })
  
  if (settings?.rateLimitEnabled) {
    const windowStart = new Date(Date.now() - settings.rateLimitWindowMs)
    const attempts = await db.loginAttempt.count({
      where: {
        ip,
        createdAt: { gte: windowStart }
      }
    })

    if (attempts >= settings.rateLimitMaxAttempts) {
      return "RATE_LIMIT_EXCEEDED"
    }
  }

  try {
    await signIn('credentials', Object.fromEntries(formData))
  } catch (error) {
    if (error instanceof AuthError) {
      const errMessage = (error.cause?.err as any)?.message;
      if (errMessage === "Missing2FA") return "REQUIRES_2FA";
      
      // If it's a real failure, record the attempt
      if (errMessage === "Invalid2FA" || error.type === 'CredentialsSignin') {
        if (settings?.rateLimitEnabled) {
          await db.loginAttempt.create({
            data: { ip, identifier: email }
          })
          
          // Cleanup old records asynchronously so DB doesn't bloat
          const cleanupWindow = new Date(Date.now() - (settings.rateLimitWindowMs * 2))
          db.loginAttempt.deleteMany({
            where: { createdAt: { lt: cleanupWindow } }
          }).catch(() => {})
        }
      }

      if (errMessage === "Invalid2FA") return "INVALID_2FA";
      if (errMessage === "Global2FAEnforced") return "GLOBAL_LOCKED";
      
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.'
        default:
          return 'Something went wrong.'
      }
    }
    throw error
  }
}
