"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { hasPermission } from "@/lib/auth-utils"

export async function linkAssetToVulnerability(formData: FormData) {
  const session = await auth()
  if (!session?.user || !hasPermission(session as any, 'LINK_VULN_TO_ASSET')) {
    throw new Error("Forbidden")
  }

  const vulnId = formData.get("vulnId") as string
  const assetId = formData.get("assetId") as string

  if (!vulnId || !assetId) throw new Error("Invalid parameters")

  await db.vulnerability.update({
    where: { id: vulnId },
    data: {
      affectedAssets: {
        connect: { id: assetId }
      }
    }
  })

  await db.auditLog.create({
    data: {
      action: "VULN_ASSET_LINKED",
      entityType: "Vulnerability",
      entityId: vulnId,
      userId: session.user.id,
      changes: `Asset ${assetId} formally linked as an affected node.`
    }
  })

  revalidatePath(`/vulnerabilities/${vulnId}`)
}

export async function unlinkAssetFromVulnerability(formData: FormData) {
  const session = await auth()
  if (!session?.user || !hasPermission(session as any, 'LINK_VULN_TO_ASSET')) {
    throw new Error("Forbidden")
  }

  const vulnId = formData.get("vulnId") as string
  const assetId = formData.get("assetId") as string

  if (!vulnId || !assetId) throw new Error("Invalid parameters")

  await db.vulnerability.update({
    where: { id: vulnId },
    data: {
      affectedAssets: {
        disconnect: { id: assetId }
      }
    }
  })

  await db.auditLog.create({
    data: {
      action: "VULN_ASSET_UNLINKED",
      entityType: "Vulnerability",
      entityId: vulnId,
      userId: session.user.id,
      changes: `Asset ${assetId} formally detached from this vulnerability impact sphere.`
    }
  })

  revalidatePath(`/vulnerabilities/${vulnId}`)
}
