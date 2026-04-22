"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { dispatchWebhook } from "@/lib/webhook"
import { sendCriticalAlertEmail, sendAssetCompromisedEmail } from "@/lib/mailer"
import { dispatchMassAlert } from "@/lib/notifier"
import { fireHook } from "@/lib/plugins/hook-engine"
import { hasPermission } from "@/lib/auth-utils"
import { getGlobalSettings } from "@/lib/settings";

export async function createIncident(prevState: any, formData: FormData) {
  const session = await auth()
  if (!session?.user || !hasPermission(session, 'CREATE_INCIDENTS')) {
    throw new Error("Forbidden: You do not possess the clearance to mint operational incidents.")
  }

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const severity = formData.get("severity") as string
  const assetIds = (formData.getAll("assetIds") as string[]).filter(id => id !== 'NONE')
  const type = formData.get("type") as string || "OTHER"

  const rawTags = formData.getAll("tags") as string[]
  const tags = rawTags
    .map(t => t.trim())
    .filter(t => t !== '')
    .map(t => t.startsWith('#') ? t : `#${t}`)

  if (!title || !description) {
    return { error: "Title and description are required." }
  }

  // CVE-400 Boundary DoS mitigation: Truncate oversized payloads
  if (title.length > 255) throw new Error("Boundary Exception: Title exceeds 255 maximum characters");
  if (description.length > 50000) throw new Error("Boundary Exception: Description payload exceeds 50000 maximum characters");

  const safeTitle = title.substring(0, 255);
  const safeDescription = description.substring(0, 50000);

  const settings = await getGlobalSettings()
  const effectiveSeverity = severity as any || 'LOW'
  
  let slaHours: number | null = null;
  switch(severity) {
    case 'CRITICAL': slaHours = settings?.slaCriticalHours ?? 4; break;
    case 'HIGH':     slaHours = settings?.slaHighHours ?? 24; break;
    case 'MEDIUM':   slaHours = settings?.slaMediumHours ?? 72; break;
    case 'LOW':      slaHours = settings?.slaLowHours ?? 168; break;
    default:         slaHours = null; break; // INFO has no SLA requirement
  }

  const [newIncident, affectedAssets] = await db.$transaction(async (tx) => {
    let created = await tx.incident.create({
      data: {
        title: safeTitle,
        description: safeDescription,
        type: type as any,
        severity: effectiveSeverity,
        reporterId: session.user.id,
        assets: (hasPermission(session, 'LINK_INCIDENT_TO_ASSET') && assetIds.length > 0) ? {
          connect: assetIds.map(id => ({ id }))
        } : undefined,
        status: 'NEW',
        targetSlaDate: null,
        tags
      }
    });

    if (slaHours !== null) {
      await tx.$executeRaw`UPDATE "Incident" SET "targetSlaDate" = NOW() + (${slaHours} * INTERVAL '1 hour') WHERE id = ${created.id}`;
      // Re-fetch to guarantee hooks, emails, and SOA get the absolute exact PostgreSQL timestamp
      created = await tx.incident.findUnique({ where: { id: created.id } }) as any;
    }

    // Phase 7 & 11: SOAR Automations (Auto-Quarantine)
    const sevRank = { INFO: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    const currentRank = sevRank[effectiveSeverity as keyof typeof sevRank] || 0;
    const thresholdRank = sevRank[(settings?.soarAutoQuarantineThreshold as keyof typeof sevRank) || 'CRITICAL'];

    let compromisedAssets: any[] = [];
    if (settings?.soarAutoQuarantineEnabled && assetIds.length > 0 && currentRank >= thresholdRank) {
      compromisedAssets = await tx.asset.findMany({ where: { id: { in: assetIds } } });
      await tx.asset.updateMany({
        where: { id: { in: assetIds } },
        data: { status: 'COMPROMISED' }
      });
      
      await tx.auditLog.create({
        data: {
          action: "SOAR_AUTO_QUARANTINE",
          entityType: "Incident",
          entityId: created.id,
          userId: session.user.id,
          changes: `${assetIds.length} Asset(s) automatically marked as COMPROMISED due to Incident INC-${created.id.substring(0, 8).toUpperCase()} tracking.`
        }
      });
    }

    await tx.auditLog.create({
      data: {
        action: "INCIDENT_CREATED",
        entityType: "Incident",
        entityId: created.id,
        userId: session.user.id,
        changes: { title, severity }
      }
    });

    return [created, compromisedAssets];
  });

  for (const affectedAsset of affectedAssets) {
    // Core Plugin Registry Hook
    await fireHook("onAssetCompromise", { ...affectedAsset, status: 'COMPROMISED' })

    if (settings?.smtpTriggerOnAssetCompromise) {
      const admins = await db.user.findMany({ where: { customRoles: { some: { permissions: { hasSome: ['VIEW_INCIDENTS_ALL', 'UPDATE_SYSTEM_SETTINGS'] } } }, email: { not: null } }, select: { id: true, email: true } })
      await sendAssetCompromisedEmail(affectedAsset.name, affectedAsset.ipAddress || '', admins.map(a => a.email as string))
      await dispatchMassAlert(admins.map(a => a.id), "ASSET_COMPROMISE", "ASSET COMPROMISED", `Asset ${affectedAsset.name} has been structurally quarantined.`, `/assets/${affectedAsset.id}`)
    }
  }

  // Core Plugin Registry Hook
  await fireHook("onIncidentCreated", newIncident)

  // Phase 10: Native Notification for UNASSIGNED
  const unassignedAlertUsers = await db.user.findMany({ select: { id: true } })
  await dispatchMassAlert(
     unassignedAlertUsers.map(u => u.id), 
     "UNASSIGNED", 
     "New Unassigned Incident", 
     `INC-${newIncident.id.substring(0, 8)} has been created and requires an assignee.`,
     `/incidents/${newIncident.id}`
  )

  // Phase 9 & 10: Webhook & Native Notifications Dispatch
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    const alertedUsers = await db.user.findMany({
      where: { customRoles: { some: { permissions: { hasSome: ['VIEW_INCIDENTS_ALL', 'UPDATE_SYSTEM_SETTINGS'] } } } },
      select: { id: true, email: true }
    })
    
    // Browser Notifications (Native)
    await dispatchMassAlert(
       alertedUsers.map(u => u.id), 
       severity, 
       `${severity} Incident Declared`, 
       `Incident ${title} requires immediate triage.`,
       `/incidents/${newIncident.id}`
    )

    const shouldSendEmail = (severity === 'CRITICAL' && settings?.smtpTriggerOnCritical) || (severity === 'HIGH' && settings?.smtpTriggerOnHigh)
    if (shouldSendEmail) {
      const targetEmails = alertedUsers.filter(u => u.email).map(u => u.email as string)
      await sendCriticalAlertEmail(newIncident, targetEmails)
    }

    await dispatchWebhook({
      title: `Incident Declared: ${title}`,
      description: description,
      severity: severity,
      url: `${process.env.NEXTAUTH_URL}/incidents/${newIncident.id}`
    })
  }

  redirect(`/incidents/${newIncident.id}`)
}
