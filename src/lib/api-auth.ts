import { headers } from "next/headers"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import crypto from "crypto"

/**
 * Checks for a Bearer token in headers. If present and valid, returns a mock session
 * with the user's roles. If not present, falls back to the standard web UI session.
 */
export async function apiAuth() {
  const reqHeaders = await headers()
  const authHeader = reqHeaders.get("authorization")

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const rawToken = authHeader.substring(7)
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")

    const apiToken = await db.apiToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, name: true, email: true, roles: true, isDisabled: true } } }
    })

    if (apiToken && !apiToken.user.isDisabled) {
      // Check expiration
      if (apiToken.expiresAt && apiToken.expiresAt < new Date()) {
        return null // Token expired
      }

      // Async update lastUsedAt to not block the request
      db.apiToken.update({
        where: { id: apiToken.id },
        data: { lastUsedAt: new Date() }
      }).catch(console.error)

      // Return a pseudo-session
      return {
        user: {
          id: apiToken.user.id,
          name: apiToken.user.name,
          email: apiToken.user.email,
          roles: apiToken.user.roles
        }
      }
    } else {
      return null // Invalid explicit bearer token
    }
  }

  // Fallback to standard web session
  const session = await auth()
  return session
}
