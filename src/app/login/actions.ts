"use server"

import { signIn } from "@/auth"
import { AuthError } from "next-auth"
import { db } from "@/lib/db"
import { headers } from "next/headers"
import { getGlobalSettings } from "@/lib/settings";

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  const reqHeaders = await headers()
  const trustProxyHeaders = process.env.TRUST_PROXY_HEADERS === "true"
  const xRealIp = reqHeaders.get("x-real-ip")?.trim()
  const xForwardedFor = reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
  const ip = trustProxyHeaders
    ? (xRealIp || xForwardedFor || "unknown-ip")
    : (xRealIp || "unknown-ip")
  const email = formData.get('email') as string || 'unknown-email'

  const settings = await getGlobalSettings()
  
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
    const payload = Object.fromEntries(formData)
    await signIn('credentials', { ...payload, redirectTo: '/' })
  } catch (error: any) {
    // NextAuth errors might fail instanceof check due to package resolution issues, so we check type or name
    const isAuthError = error instanceof AuthError || error?.name?.includes('AuthError') || error?.type?.includes('Error') || typeof error.type === 'string';
    
    if (isAuthError) {
      const customCause = error.cause?.err as any;
      const errMessage = customCause?.message || customCause?.code || error.code || error.type || error.message;
      
      if (errMessage === "Missing2FA") return "REQUIRES_2FA";
      
      // Cleanup old records
      if (errMessage === "Invalid2FA" || error.type === 'CredentialsSignin') {
        if (settings?.rateLimitEnabled) {
          const cleanupWindow = new Date(Date.now() - (settings.rateLimitWindowMs * 2))
          db.loginAttempt.deleteMany({
            where: { createdAt: { lt: cleanupWindow } }
          }).catch(() => {})
        }
      }

      if (errMessage === "Invalid2FA") return "INVALID_2FA";
      if (errMessage === "Global2FAEnforced") return "GLOBAL_LOCKED";
      if (errMessage === "EmailNotVerified") return "EMAIL_NOT_VERIFIED";
      if (errMessage === "IdentitySuspended") return "IDENTITY_SUSPENDED";
      
      if (error.type === 'CredentialsSignin') {
        return 'Invalid credentials.'
      }
      
      console.error("Authentication Error Details:", { type: error.type, message: error.message, cause: error.cause });
      return 'Something went wrong.'
    }
    
    // If it's a NEXT_REDIRECT error, we MUST throw it so Next.js can perform the redirect!
    if (error?.message?.includes('NEXT_REDIRECT') || error?.name === 'RedirectError' || (error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT'))) {
      throw error;
    }
    
    console.error("Unknown Error during authentication:", error);
    return 'Something went wrong.'
  }
}
