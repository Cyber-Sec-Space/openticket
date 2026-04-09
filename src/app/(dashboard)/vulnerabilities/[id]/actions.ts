"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { hasPermission } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import { VulnStatus } from "@prisma/client"

async function computeVulnStatus(vulnId: string) {
  const assets = await db.vulnerabilityAsset.findMany({ where: { vulnId } })
  if (assets.length === 0) {
    await db.vulnerability.update({ where: { id: vulnId }, data: { status: 'OPEN' } })
    return
  }

  const allResolved = assets.every(a => a.status === 'PATCHED' || a.status === 'FALSE_POSITIVE')
  const anyAffected = assets.some(a => a.status === 'AFFECTED')

  let computedStatus: VulnStatus = 'OPEN'
  if (allResolved) computedStatus = 'RESOLVED'
  else if (!anyAffected && assets.some(a => a.status === 'MITIGATED')) computedStatus = 'MITIGATED'

  await db.vulnerability.update({ where: { id: vulnId }, data: { status: computedStatus } })
}

export async function updateVulnAssetStatusAction(formData: FormData) {
  const session = await auth()
  
  if (!session?.user || !hasPermission(session as any, 'UPDATE_VULNERABILITIES')) {
    throw new Error("Forbidden: Strict Access Control")
  }

  const vulnAssetId = formData.get("vulnAssetId") as string
  const newStatusRaw = formData.get("status") as string
  const vulnId = formData.get("vulnId") as string
  
  if (!vulnAssetId || !newStatusRaw || !vulnId) throw new Error("Missing parameters")

  const newStatus = newStatusRaw as any

  await db.vulnerabilityAsset.update({
    where: { id: vulnAssetId },
    data: { status: newStatus }
  })

  await computeVulnStatus(vulnId)

  // Mandatory SecOps Audit Trail
  await db.auditLog.create({
    data: {
      action: "VULN_ASSET_STATUS_MODIFIED",
      entityType: "VulnerabilityAsset",
      entityId: vulnAssetId,
      userId: session.user.id,
      changes: `Modified Threat Posture for asset resolving to <${newStatus}>.`
    }
  })

  revalidatePath(`/vulnerabilities/${vulnId}`)
  revalidatePath(`/vulnerabilities`)
}

export async function addAssigneesAction(formData: FormData) {
  const session = await auth()
  const hasSelf = hasPermission(session as any, 'ASSIGN_VULNERABILITIES_SELF')
  const hasOthers = hasPermission(session as any, 'ASSIGN_VULNERABILITIES_OTHERS')
  if (!session?.user || (!hasSelf && !hasOthers)) throw new Error("Unauthorized")

  const vulnId = formData.get("vulnId") as string
  const userIds = formData.getAll("userIds") as string[]
  
  if (!hasOthers && hasSelf) {
     if (userIds.length !== 1 || userIds[0] !== session.user.id) {
        throw new Error("Forbidden: You can only assign yourself.")
     }
  }
  
  await db.vulnerability.update({
    where: { id: vulnId },
    data: { assignees: { connect: userIds.map(id => ({ id })) } }
  })
  
  revalidatePath(`/vulnerabilities/${vulnId}`)
}

export async function removeAssigneeAction(formData: FormData) {
  const session = await auth()
  const hasSelf = hasPermission(session as any, 'ASSIGN_VULNERABILITIES_SELF')
  const hasOthers = hasPermission(session as any, 'ASSIGN_VULNERABILITIES_OTHERS')
  if (!session?.user || (!hasSelf && !hasOthers)) throw new Error("Unauthorized")

  const vulnId = formData.get("vulnId") as string
  const userId = formData.get("userId") as string
  
  if (!hasOthers && hasSelf && userId !== session.user.id) {
     throw new Error("Forbidden: You can only remove yourself.")
  }
  
  await db.vulnerability.update({
    where: { id: vulnId },
    data: { assignees: { disconnect: { id: userId } } }
  })
  
  revalidatePath(`/vulnerabilities/${vulnId}`)
}

export async function postVulnCommentAction(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  if (!hasPermission(session as any, 'VIEW_VULNERABILITIES') || !hasPermission(session as any, 'ADD_COMMENTS')) {
     throw new Error("Forbidden: You lack either view clearance or the ADD_COMMENTS capability.")
  }

  const vulnId = formData.get("vulnId") as string
  const content = formData.get("content") as string
  
  if (!vulnId || !content.trim()) throw new Error("Missing parameters")

  await db.comment.create({
    data: {
      content,
      vulnId,
      authorId: session.user.id
    }
  })
  
  revalidatePath(`/vulnerabilities/${vulnId}`)
}

export async function linkVulnAssetAction(formData: FormData) {
  const session = await auth()
  if (!session?.user || !hasPermission(session as any, 'LINK_VULN_TO_ASSET')) throw new Error("Unauthorized")

  const vulnId = formData.get("vulnId") as string
  const assetId = formData.get("assetId") as string
  
  try {
    await db.vulnerabilityAsset.create({
      data: { vulnId, assetId }
    })
    await computeVulnStatus(vulnId)
  } catch (e) {
    // ignore unique constraint
  }
  
  revalidatePath(`/vulnerabilities/${vulnId}`)
}

export async function unlinkVulnAssetAction(formData: FormData) {
  const session = await auth()
  if (!session?.user || !hasPermission(session as any, 'LINK_VULN_TO_ASSET')) throw new Error("Unauthorized")

  const vulnAssetId = formData.get("vulnAssetId") as string
  const vulnId = formData.get("vulnId") as string
  
  await db.vulnerabilityAsset.deleteMany({
    where: { id: vulnAssetId }
  })
  await computeVulnStatus(vulnId)
  
  revalidatePath(`/vulnerabilities/${vulnId}`)
}

export async function deleteVulnerabilityAction(formData: FormData) {
  const session = await auth()
  
  if (!session?.user || !hasPermission(session as any, 'DELETE_VULNERABILITIES')) {
    throw new Error("Forbidden: Strict Admin Access Control for Destructive Operations")
  }

  const vulnId = formData.get("vulnId") as string
  if (!vulnId) throw new Error("Missing vuln ID")

  // Scrub physical orphan files before Prisma cascade sweeps the metadata
  try {
    const vuln = await db.vulnerability.findUnique({
      where: { id: vulnId },
      include: { attachments: true }
    })
    if (vuln?.attachments?.length) {
      const fs = await import('fs')
      const path = await import('path')
      for (const att of vuln.attachments) {
        if (att.fileUrl) {
          const filename = path.basename(att.fileUrl)
          const filepath = path.join(process.cwd(), 'private', 'uploads', filename)
          try {
            await fs.promises.unlink(filepath)
          } catch (e: any) {
            if (e.code !== 'ENOENT') console.error('Failed to unlink attachment:', e)
          }
        }
      }
    }
  } catch (error) {
    console.error("Failed to un-link physical files during vulnerability deletion", error)
  }

  await db.vulnerability.deleteMany({ where: { id: vulnId } })
  revalidatePath("/vulnerabilities")
  redirect("/vulnerabilities")
}
