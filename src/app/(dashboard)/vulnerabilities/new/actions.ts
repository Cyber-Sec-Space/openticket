"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { Severity } from "@prisma/client"
import { sendNewVulnerabilityAlertEmail } from "@/lib/mailer"
import { hasPermission } from "@/lib/auth-utils"
import { getGlobalSettings } from "@/lib/settings";

export async function createVulnerabilityAction(formData: FormData) {
  const session = await auth()
  
  if (!session?.user || !hasPermission(session, 'CREATE_VULNERABILITIES')) {
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

  const settings = await getGlobalSettings()
  
  let slaHours: number | null = null;
  switch (severity) {
    case 'CRITICAL': slaHours = settings?.vulnSlaCriticalHours ?? 12; break;
    case 'HIGH':     slaHours = settings?.vulnSlaHighHours ?? 48; break;
    case 'MEDIUM':   slaHours = settings?.vulnSlaMediumHours ?? 168; break;
    case 'LOW':      slaHours = settings?.vulnSlaLowHours ?? 336; break;
    default:         slaHours = null; break; // INFO has no SLA requirement
  }

  let newVuln = await db.vulnerability.create({
    data: {
      title,
      cveId,
      description,
      cvssScore,
      severity,
      targetSlaDate: null,
      vulnerabilityAssets: hasPermission(session, 'LINK_VULN_TO_ASSET') && assetIds.length > 0
        ? { create: assetIds.map(id => ({ assetId: id, status: 'AFFECTED' })) }
        : undefined
    }
  })

  if (slaHours !== null) {
    await db.$executeRaw`UPDATE "Vulnerability" SET "targetSlaDate" = NOW() + (${slaHours} * INTERVAL '1 hour') WHERE id = ${newVuln.id}`;
    // Re-fetch to guarantee hooks and emails get the absolute exact PostgreSQL timestamp
    newVuln = await db.vulnerability.findUnique({ where: { id: newVuln.id } }) as any;
  }

  const { fireHook } = await import("@/lib/plugins/hook-engine");
  await fireHook("onVulnerabilityCreated", newVuln);

  // SOAR Automations (Auto-Quarantine)
  const sevRank = { INFO: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }
  const currentRank = sevRank[severity as keyof typeof sevRank] || 0
  const thresholdRank = sevRank[(settings?.soarAutoQuarantineThreshold as keyof typeof sevRank) || 'CRITICAL']

  if (settings?.soarAutoQuarantineEnabled && assetIds.length > 0 && currentRank >= thresholdRank) {
    const affectedAssets = await db.asset.findMany({ where: { id: { in: assetIds } } })
    await db.asset.updateMany({
      where: { id: { in: assetIds } },
      data: { status: 'COMPROMISED' }
    })
    
    const { sendAssetCompromisedEmail } = await import("@/lib/mailer")
    const { dispatchMassAlert } = await import("@/lib/notifier")
    
    for (const affectedAsset of affectedAssets) {
      await fireHook("onAssetCompromise", { ...affectedAsset, status: 'COMPROMISED' })

      if (settings?.smtpTriggerOnAssetCompromise) {
        const admins = await db.user.findMany({ where: { customRoles: { some: { permissions: { hasSome: ['VIEW_INCIDENTS_ALL', 'UPDATE_SYSTEM_SETTINGS'] } } }, email: { not: null } }, select: { id: true, email: true } })
        await sendAssetCompromisedEmail(affectedAsset.name, affectedAsset.ipAddress || '', admins.map(a => a.email as string))
        await dispatchMassAlert(admins.map(a => a.id), "ASSET_COMPROMISE", "ASSET COMPROMISED", `Asset ${affectedAsset.name} has been structurally quarantined.`, `/assets/${affectedAsset.id}`)
      }
    }
    
    await db.auditLog.create({
      data: {
        action: "SOAR_AUTO_QUARANTINE",
        entityType: "Vulnerability",
        entityId: newVuln.id,
        userId: session.user.id,
        changes: `${assetIds.length} Asset(s) automatically marked as COMPROMISED due to Vulnerability VULN-${newVuln.id.substring(0, 8).toUpperCase()} tracking.`
      }
    })
  }

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

  if (settings?.smtpTriggerOnNewVulnerability) {
    const admins = await db.user.findMany({ where: { customRoles: { some: { permissions: { hasSome: ['UPDATE_VULNERABILITIES', 'VIEW_VULNERABILITIES'] } } }, email: { not: null } }, select: { email: true } })
    await sendNewVulnerabilityAlertEmail(newVuln.title, newVuln.severity, admins.map(a => a.email as string))
  }

  revalidatePath("/vulnerabilities")
  redirect("/vulnerabilities")
}
