import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { db } from "./lib/db"
import bcrypt from "bcryptjs"
import * as OTPAuth from "otpauth"
import { CredentialsSignin } from "next-auth"

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
        const user = await db.user.findUnique({
          where: { email: credentials.email as string }
        })
        if (!user || (!user.passwordHash)) {
          return null
        }
        const isValid = await bcrypt.compare(credentials.password as string, user.passwordHash)
        if (!isValid) return null

        // Fetch global directives
        const settings = await db.systemSetting.findUnique({ where: { id: "global" } })
        const requireGlobal2FA = settings?.requireGlobal2FA ?? false

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
          role: user.role
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as any
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" }
})
