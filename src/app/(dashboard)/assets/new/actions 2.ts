"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { hasPermission } from "@/lib/auth-utils"

export async function createAsset(formData: FormData) {
  const session = await auth()
  if (!session?.user || !hasPermission(session as any, 'CREATE_ASSETS')) {
    throw new Error("Forbidden")
  }

  const name = formData.get("name") as string
  const type = formData.get("type") as any
  const status = formData.get("status") as any
  const ipAddress = formData.get("ipAddress") as string
  const externalId = formData.get("externalId") as string

  if (!name || !type) return
  if (name.length > 255) throw new Error("Input Boundary Violation: Name exceeds maximum length");
  if (ipAddress && ipAddress.length > 128) throw new Error("Input Boundary Violation: IP Address exceeds maximum length");
  if (externalId && externalId.length > 255) throw new Error("Input Boundary Violation: External ID exceeds maximum length");
  
  const safeName = name.substring(0, 255);
  const safeIp = ipAddress ? ipAddress.substring(0, 128) : null;
  const safeExternalId = externalId ? externalId.substring(0, 255) : null;

  const asset = await db.asset.create({
    data: {
      name: safeName,
      type,
      status: status || "ACTIVE",
      ipAddress: safeIp,
      externalId: safeExternalId,
    }
  })

  const { fireHook } = await import("@/lib/plugins/hook-engine");
  await fireHook("onAssetCreated", asset);

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
