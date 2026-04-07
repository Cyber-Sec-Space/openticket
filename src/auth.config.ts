import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  providers: [], // Providers must be empty here for Edge compatibility. Filled in auth.ts.
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (!token) return session;
      if (session.user) {
        session.user.id = token.id as string
        session.user.permissions = token.permissions as string[]
      }
      return session
    }
  }
} satisfies NextAuthConfig;
