import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { db } from "./lib/db"
import bcrypt from "bcryptjs"
import * as OTPAuth from "otpauth"
import { CredentialsSignin } from "next-auth"

declare module "next-auth" {
  interface User {
    permissions?: string[]
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

class Global2FAEnforcedError extends Error {
  constructor() {
    super("Global2FAEnforced");
    this.name = "Global2FAEnforcedError";
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

export const { handlers, signIn, signOut, auth } = NextAuth({
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
        
        // Fetch global directives (Moved up for early evaluation)
        const settings = await db.systemSetting.findUnique({ where: { id: "global" } })
        
        // --- Distributed Rate Limiting Strategy (Brute Force Protection) ---
        const rateLimitEnabled = settings?.rateLimitEnabled ?? true;
        const windowMs = settings?.rateLimitWindowMs ?? 900000; // default 15 min
        const maxAttempts = settings?.rateLimitMaxAttempts ?? 5;
        
        if (rateLimitEnabled) {
           const limitThresholdTime = new Date(Date.now() - windowMs);
           
           // Cross-Cluster State Synchronization
           const attemptCount = await db.loginAttempt.count({
              where: {
                 identifier: email,
                 createdAt: { gte: limitThresholdTime }
              }
           });
           
           if (attemptCount >= maxAttempts) {
               throw new AuthenticationThrottledError();
           }
        }

        const user = await db.user.findUnique({
          where: { email },
          include: { customRoles: { select: { permissions: true } } }
        })
        
        // In Server Actions/NextAuth backend context, true client IP is often decoupled/proxied. 
        // We track via `identifier` isolated boundaries to preserve standard lockouts payload structure.
        const mockIp = "127.0.0.1"; 

        if (!user || (!user.passwordHash)) {
          // Record failure for invalid user asynchronously
          if (rateLimitEnabled) {
              await db.loginAttempt.create({ data: { identifier: email, ip: mockIp } });
          }
          return null
        }
        
        const isValid = await bcrypt.compare(credentials.password as string, user.passwordHash)
        if (!isValid) {
          // Record failure for valid user asynchronously
          if (rateLimitEnabled) {
              await db.loginAttempt.create({ data: { identifier: email, ip: mockIp } });
          }
          return null
        }
        
        // Successful login, clear failures distributed globally across all pods
        if (rateLimitEnabled) {
            await db.loginAttempt.deleteMany({ where: { identifier: email } });
        }

        const requireGlobal2FA = settings?.requireGlobal2FA ?? false

        if (settings?.requireEmailVerification && settings?.smtpEnabled && !user.emailVerified) {
          throw new EmailNotVerifiedError()
        }

        // Determine effective 2FA status (either enforced globally or opted-in personally)
        if (requireGlobal2FA || user.isTwoFactorEnabled) {
          if (!user.isTwoFactorEnabled || !user.twoFactorSecret) {
            // Global lock restricts non-compliant nodes entirely
            if (requireGlobal2FA) throw new Global2FAEnforcedError()
            // Otherwise, normal missing path (should never theoretically trigger if isTwoFactorEnabled without secret, unless DB compromised)
            return null
          }

          const code = credentials.totpCode as string
          if (!code) {
             throw new Missing2FAError()
          }
          const totp = new OTPAuth.TOTP({ secret: user.twoFactorSecret, algorithm: 'SHA1', digits: 6, period: 30 })
          const isTotpValid = totp.validate({ token: code, window: 1 }) !== null
          if (!isTotpValid) {
             throw new Invalid2FAError()
          }
        }

        const perms = Array.from(new Set(user.customRoles.flatMap(r => r.permissions)))

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          permissions: perms
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.permissions = user.permissions
      }
      // Force database check for real-time ban enforcement and Role syncing
      if (token.id) {
        const dbUser = await db.user.findUnique({ where: { id: token.id as string }, select: { isDisabled: true, customRoles: { select: { permissions: true } } } })
        if (!dbUser || dbUser.isDisabled) {
           return null // Returning null instantly destroys the JWT token and logs the user out
        } else {
           token.permissions = Array.from(new Set(dbUser.customRoles.flatMap(r => r.permissions))) // Sync RBAC
        }
      }
      return token
    },
    async session({ session, token }) {
      if (!token) return session;
      if (session.user) {
        session.user.id = token.id as string
        session.user.permissions = token.permissions as string[]
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" }
})
