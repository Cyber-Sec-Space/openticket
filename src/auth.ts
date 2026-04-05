import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { db } from "./lib/db"
import bcrypt from "bcrypt"
import * as OTPAuth from "otpauth"
import { CredentialsSignin } from "next-auth"

declare module "next-auth" {
  interface User {
    roles?: string[]
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

// Global in-memory rate limit store for brute force protection
const loginAttempts = new Map<string, { count: number, resetAt: number }>();

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
        
        // --- Rate Limiting Strategy (Brute Force Protection) ---
        const now = Date.now();
        const record = loginAttempts.get(email);
        
        if (record && now < record.resetAt) {
           if (record.count >= 5) {
               throw new AuthenticationThrottledError();
           }
        } else if (record && now >= record.resetAt) {
           // Reset window
           loginAttempts.delete(email);
        }

        const user = await db.user.findUnique({
          where: { email }
        })
        
        if (!user || (!user.passwordHash)) {
          // Record failure for invalid user
          const updatedRecord = loginAttempts.get(email) || { count: 0, resetAt: now + 5 * 60 * 1000 };
          updatedRecord.count += 1;
          loginAttempts.set(email, updatedRecord);
          return null
        }
        
        const isValid = await bcrypt.compare(credentials.password as string, user.passwordHash)
        if (!isValid) {
          // Record failure for valid user
          const updatedRecord = loginAttempts.get(email) || { count: 0, resetAt: now + 5 * 60 * 1000 };
          updatedRecord.count += 1;
          loginAttempts.set(email, updatedRecord);
          return null
        }
        
        // Successful login, clear failures
        loginAttempts.delete(email);

        // Fetch global directives
        const settings = await db.systemSetting.findUnique({ where: { id: "global" } })
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

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.roles = user.roles
      }
      // Force database check for real-time ban enforcement and Role syncing
      if (token.id) {
        const dbUser = await db.user.findUnique({ where: { id: token.id as string }, select: { isDisabled: true, roles: true } })
        if (!dbUser || dbUser.isDisabled) {
           return null // Returning null instantly destroys the JWT token and logs the user out
        } else {
           token.roles = dbUser.roles // Sync RBAC
        }
      }
      return token
    },
    async session({ session, token }) {
      if (!token) return session;
      if (session.user) {
        session.user.id = token.id as string
        session.user.roles = token.roles as any
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" }
})
