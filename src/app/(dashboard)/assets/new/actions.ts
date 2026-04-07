"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { hasPermission } from "@/lib/auth-utils"

export async function createAsset(formData: FormData) {
  const session = await auth()
  if (!session?.user || !hasPermission(session as any, 'MANAGE_ASSETS')) {
    throw new Error("Forbidden")
  }

  const name = formData.get("name") as string
  const type = formData.get("type") as any
  const status = formData.get("status") as any
  const ipAddress = formData.get("ipAddress") as string

  if (!name || !type) return

  const asset = await db.asset.create({
    data: {
      name,
      type,
      status: status || "ACTIVE",
      ipAddress: ipAddress || null,
    }
  })

  // Log creation metrics to Unified Timeline
  await db.auditLog.create({
    data: {
      action: "ASSET_REGISTERED",
      entityType: "Asset",
      entityId: asset.id,
      userId: session.user.id,
      changes: `Node Registered: ${name} [${type}] @ ${ipAddress || 'Internal'}`
    }
  })

  redirect(`/assets/${asset.id}`)
}
