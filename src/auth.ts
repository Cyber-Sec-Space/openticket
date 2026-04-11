import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { db } from "./lib/db"
import bcrypt from "bcryptjs"
import * as OTPAuth from "otpauth"
import { CredentialsSignin, DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    permissions?: string[]
    requires2FASetup?: boolean
  }
  interface Session {
    user: {
      id: string
      permissions: string[]
      requires2FASetup?: boolean
    } & DefaultSession["user"]
  }
}

class Missing2FAError extends Error {
  constructor() {
    super("Missing2FA");
    this.name = "Missing2FAError";
  }
}

class Invalid2FAError extends Error {
  constructor() {
    super("Invalid2FA");
    this.name = "Invalid2FAError";
  }
}


class EmailNotVerifiedError extends Error {
  constructor() {
    super("EmailNotVerified");
    this.name = "EmailNotVerifiedError";
  }
}

// Database-backed distributed rate limit tracking replaces volatile in-memory strategies

class AuthenticationThrottledError extends Error {
  constructor() {
    super("AuthenticationThrottled");
    this.name = "AuthenticationThrottledError";
  }
}

import { headers } from "next/headers"
import { authConfig } from "./auth.config"

export const { handlers, signIn, signOut, auth, unstable_update: update } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "2FA Token", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }
        
        const email = credentials.email as string;
        
        // Securely identify the network boundary of the requester
        const requestHeaders = await headers();
        const requestIp = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() 
                       || requestHeaders.get("x-real-ip") 
                       || "127.0.0.1";
        
        // Fetch global directives (Moved up for early evaluation)
        const settings = await db.systemSetting.findUnique({ where: { id: "global" } })
        
        // --- Distributed Rate Limiting Strategy (Brute Force Protection) ---
        const rateLimitEnabled = settings?.rateLimitEnabled ?? true;
        const windowMs = settings?.rateLimitWindowMs ?? 900000; // default 15 min
        const maxAttempts = settings?.rateLimitMaxAttempts ?? 5;
        
        if (rateLimitEnabled) {
           const limitThresholdTime = new Date(Date.now() - windowMs);
           
           // We must decouple the bounds to prevent botnet IP-rotation bypasses.
           // 1. Halt localized botnet attacks from a single source
           const ipAttempts = await db.loginAttempt.count({
              where: {
                 ip: requestIp,
                 createdAt: { gte: limitThresholdTime }
              }
           });
           
           if (ipAttempts >= (maxAttempts * 4)) {
               throw new AuthenticationThrottledError(); // Soft-ban the IP entirely if excessively malicious
           }

           // 2. Halt targeted dictionary attacks against a specific account (Credential Stuffing)
           const accountAttempts = await db.loginAttempt.count({
              where: {
                 identifier: email,
                 createdAt: { gte: limitThresholdTime }
              }
           });
           
           if (accountAttempts >= maxAttempts) {
               throw new AuthenticationThrottledError();
           }
        }

        const user = await db.user.findUnique({
          where: { email },
          include: { customRoles: { select: { permissions: true } } }
        })

        if (!user || (!user.passwordHash)) {
          // Record failure for invalid user asynchronously
          if (rateLimitEnabled) {
              await db.loginAttempt.create({ data: { identifier: email, ip: requestIp } });
          }
          return null
        }
        
        const isValid = await bcrypt.compare(credentials.password as string, user.passwordHash)
        if (!isValid) {
          // Record failure for valid user asynchronously
          if (rateLimitEnabled) {
              await db.loginAttempt.create({ data: { identifier: email, ip: requestIp } });
          }
          return null
        }
        

        const requireGlobal2FA = settings?.requireGlobal2FA ?? false

        if (settings?.requireEmailVerification && settings?.smtpEnabled && !user.emailVerified) {
          throw new EmailNotVerifiedError()
        }

        // Determine effective 2FA status (if opted-in personally and enrolled)
        if (user.isTwoFactorEnabled && user.twoFactorSecret) {
          const code = credentials.totpCode as string
          if (!code) {
             if (rateLimitEnabled) await db.loginAttempt.create({ data: { identifier: email, ip: requestIp } });
             throw new Missing2FAError()
          }
          const totp = new OTPAuth.TOTP({ secret: user.twoFactorSecret, algorithm: 'SHA1', digits: 6, period: 30 })
          const isTotpValid = totp.validate({ token: code, window: 1 }) !== null
          if (!isTotpValid) {
             if (rateLimitEnabled) await db.loginAttempt.create({ data: { identifier: email, ip: requestIp } });
             throw new Invalid2FAError()
          }
        }

        // Successful login and 2FA verified, clear failures distributed globally across all pods
        if (rateLimitEnabled) {
            await db.loginAttempt.deleteMany({ where: { identifier: email } });
        }

        const perms = Array.from(new Set(user.customRoles.flatMap(r => r.permissions)))

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          permissions: perms,
          requires2FASetup: requireGlobal2FA && (!user.isTwoFactorEnabled || !user.twoFactorSecret)
        } as any
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.permissions = user.permissions
        token.requires2FASetup = (user as any).requires2FASetup
      }
      // Force database check for real-time ban enforcement and Role syncing
      // ONLY run this in Node.js runtime to prevent Prisma crashing Edge Middleware
      if (token.id && process.env.NEXT_RUNTIME === "nodejs") {
        const dbUser = await db.user.findUnique({ where: { id: token.id as string }, select: { isDisabled: true, customRoles: { select: { permissions: true } }, isTwoFactorEnabled: true, twoFactorSecret: true } })
        if (!dbUser || dbUser.isDisabled) {
           return null // Returning null instantly destroys the JWT token and logs the user out
        } else {
           token.permissions = Array.from(new Set(dbUser.customRoles.flatMap(r => r.permissions))) // Sync RBAC
           const settings = await db.systemSetting.findUnique({ where: { id: "global" } })
           token.requires2FASetup = (settings?.requireGlobal2FA ?? false) && (!dbUser.isTwoFactorEnabled || !dbUser.twoFactorSecret)
        }
      }
      return token
    }
  },
  session: { strategy: "jwt" }
})
