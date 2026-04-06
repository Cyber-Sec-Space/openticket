"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { VulnStatus } from "@prisma/client"

export async function updateVulnStatusAction(formData: FormData) {
  const session = await auth()
  
  if (!session?.user || (!session.user.roles.includes('ADMIN') && !session.user.roles.includes('SECOPS'))) {
    throw new Error("Forbidden: Strict Access Control")
  }

  const vulnId = formData.get("vulnId") as string
  const newStatusRaw = formData.get("status") as string
  const targetSlaDateRaw = formData.get("targetSlaDate") as string
  const targetSlaDate = targetSlaDateRaw && targetSlaDateRaw.trim() !== "" ? new Date(targetSlaDateRaw) : null
  
  if (!vulnId || !newStatusRaw) {
    throw new Error("Missing parameters for mutating Vulnerability states.")
  }

  const newStatus = newStatusRaw as VulnStatus

  // Authoritative mutate hook
  const updatedVuln = await db.vulnerability.update({
    where: { id: vulnId },
    data: { status: newStatus, targetSlaDate },
    select: { title: true }
  })

  // Mandatory SecOps Audit Trail
  await db.auditLog.create({
    data: {
      action: "VULN_STATUS_MODIFIED",
      entityType: "Vulnerability",
      entityId: vulnId,
      userId: session.user.id,
      changes: `Modified Threat Posture for ${updatedVuln.title} resolving to <${newStatus}> globally.`
    }
  })

  revalidatePath(`/vulnerabilities/${vulnId}`)
  revalidatePath(`/vulnerabilities`)
}

export async function deleteVulnerabilityAction(formData: FormData) {
  const session = await auth()
  
  if (!session?.user || !session.user.roles.includes('ADMIN')) {
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
