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

  const newVuln = await db.$transaction(async (tx) => {
    let created = await tx.vulnerability.create({
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
    });

    if (slaHours !== null) {
      await tx.$executeRaw`UPDATE "Vulnerability" SET "targetSlaDate" = NOW() + (${slaHours} * INTERVAL '1 hour') WHERE id = ${created.id}`;
      // Re-fetch to guarantee hooks and emails get the absolute exact PostgreSQL timestamp
      created = await tx.vulnerability.findUnique({ where: { id: created.id } }) as any;
    }

    // Telemetry Audit log hook
    await tx.auditLog.create({
      data: {
        action: "VULN_DISCOVERED",
        entityType: "Vulnerability",
        entityId: created.id,
        userId: session.user.id,
        changes: `Minted Threat metrics ${cveId || created.title} logging local CVSS:[${cvssScore}]`
      }
    });

    return created;
  });

  const { fireHook } = await import("@/lib/plugins/hook-engine");
  await fireHook("onVulnerabilityCreated", newVuln);

  if (settings?.smtpTriggerOnNewVulnerability) {
    const admins = await db.user.findMany({ where: { customRoles: { some: { permissions: { hasSome: ['UPDATE_VULNERABILITIES', 'VIEW_VULNERABILITIES'] } } }, email: { not: null } }, select: { email: true } })
    await sendNewVulnerabilityAlertEmail(newVuln.title, newVuln.severity, admins.map(a => a.email as string))
  }

  revalidatePath("/vulnerabilities")
  redirect("/vulnerabilities")
}
