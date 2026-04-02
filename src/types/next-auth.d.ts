import NextAuth, { type DefaultSession } from "next-auth"

export type ExtendedUser = DefaultSession["user"] & {
  id: string
  roles: Array<"ADMIN" | "SECOPS" | "REPORTER" | "API_ACCESS">
}

declare module "next-auth" {
  interface Session {
    user: ExtendedUser
  }
}
