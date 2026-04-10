"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { Severity } from "@prisma/client"
import { sendNewVulnerabilityAlertEmail } from "@/lib/mailer"
import { hasPermission } from "@/lib/auth-utils"

export async function createVulnerabilityAction(formData: FormData) {
  const session = await auth()
  
  if (!session?.user || !hasPermission(session as any, 'CREATE_VULNERABILITIES')) {
    return { error: "Forbidden: You lack the CREATE_VULNERABILITIES capability." }
  }

  const title = formData.get("title") as string
  const cveId = formData.get("cveId") as string || null
  const description = formData.get("description") as string
  const severityStr = formData.get("severity") as string
  const severity = (severityStr || "LOW") as Severity
  
  const cvssScoreRaw = formData.get("cvssScore") as string
  const cvssScore = cvssScoreRaw ? parseFloat(cvssScoreRaw) : null

  const rawAssetIds = formData.getAll("assetIds") as string[]
  const assetIds = rawAssetIds.filter(id => id !== "NONE")

  if (!title || !description) {
    return { error: "Validation structural error: missing foundational CVE markers." }
  }

  const newVuln = await db.vulnerability.create({
    data: {
      title,
      cveId,
      description,
      cvssScore,
      severity,
      vulnerabilityAssets: hasPermission(session as any, 'LINK_VULN_TO_ASSET') && assetIds.length > 0
        ? { create: assetIds.map(id => ({ assetId: id, status: 'AFFECTED' })) }
        : undefined
    }
  })

  const { fireHook } = await import("@/lib/plugins/hook-engine");
  await fireHook("onVulnerabilityCreated", newVuln);

  // Telemetry Audit log hook
  await db.auditLog.create({
    data: {
      action: "VULN_DISCOVERED",
      entityType: "Vulnerability",
      entityId: newVuln.id,
      userId: session.user.id,
      changes: `Minted Threat metrics ${cveId || newVuln.title} logging local CVSS:[${cvssScore}]`
    }
  })

  const settings = await db.systemSetting.findUnique({ where: { id: "global" } })
  if (settings?.smtpTriggerOnNewVulnerability) {
    const admins = await db.user.findMany({ where: { customRoles: { some: { permissions: { hasSome: ['UPDATE_VULNERABILITIES', 'VIEW_VULNERABILITIES'] } } }, email: { not: null } }, select: { email: true } })
    await sendNewVulnerabilityAlertEmail(newVuln.title, newVuln.severity, admins.map(a => a.email as string))
  }

  revalidatePath("/vulnerabilities")
  redirect("/vulnerabilities")
}
