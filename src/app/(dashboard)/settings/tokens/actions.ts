"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import crypto from "crypto"

export async function createApiTokenAction(formData: FormData) {
  const session = await auth()
  if (!session?.user || (!session.user.roles.includes('API_ACCESS') && !session.user.roles.includes('ADMIN'))) {
     throw new Error("Forbidden: You do not have the API_ACCESS or ADMIN role required to mint automation tokens.")
  }

  const name = formData.get("name") as string || "Default Token"
  // Generate token: "ot_" + 48 chars of hex
  const rawToken = "ot_" + crypto.randomBytes(24).toString('hex')
  
  // Hash to store securely
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")

  await db.apiToken.create({
    data: {
      name,
      tokenHash,
      userId: session.user.id
    }
  })

  await db.auditLog.create({
    data: {
      action: "API_TOKEN_CREATED",
      entityType: "ApiToken",
      entityId: session.user.id,
      userId: session.user.id,
      changes: `Minted new API Token: ${name}`
    }
  })

  revalidatePath('/settings/tokens')
  
  // We ONLY return the raw token here so the client can display it ONCE.
  return { rawToken }
}

export async function deleteApiTokenAction(tokenId: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Forbidden")

  // Ensure user owns token
  const token = await db.apiToken.findUnique({ where: { id: tokenId } })
  if (!token || token.userId !== session.user.id) throw new Error("Forbidden or Not Found")

  await db.apiToken.delete({ where: { id: tokenId } })

  await db.auditLog.create({
    data: {
      action: "API_TOKEN_DELETED",
      entityType: "ApiToken",
      entityId: session.user.id,
      userId: session.user.id,
      changes: `Revoked API Token: ${token.name}`
    }
  })

  revalidatePath('/settings/tokens')
}
