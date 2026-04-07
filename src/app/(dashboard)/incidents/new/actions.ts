"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { dispatchWebhook } from "@/lib/webhook"
import { sendCriticalAlertEmail, sendAssetCompromisedEmail } from "@/lib/mailer"
import { dispatchMassAlert } from "@/lib/notifier"
import { fireHook } from "@/lib/plugins/hook-engine"

export async function createIncident(prevState: any, formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const severity = formData.get("severity") as string
  const assetId = formData.get("assetId") as string

  const type = formData.get("type") as string || "OTHER"

  const rawTags = formData.getAll("tags") as string[]
  const tags = rawTags
    .map(t => t.trim())
    .filter(t => t !== '')
    .map(t => t.startsWith('#') ? t : `#${t}`)

  if (!title || !description) {
    return { error: "Title and description are required." }
  }

  const settings = await db.systemSetting.findUnique({ where: { id: "global" } })
  const effectiveSeverity = severity as any || 'LOW'
  
  let targetSlaDate = new Date()
  switch (effectiveSeverity) {
    case 'CRITICAL': targetSlaDate.setHours(targetSlaDate.getHours() + (settings?.slaCriticalHours ?? 4)); break;
    case 'HIGH':     targetSlaDate.setHours(targetSlaDate.getHours() + (settings?.slaHighHours ?? 24)); break;
    case 'MEDIUM':   targetSlaDate.setHours(targetSlaDate.getHours() + (settings?.slaMediumHours ?? 72)); break;
    case 'LOW':
    default:         targetSlaDate.setHours(targetSlaDate.getHours() + (settings?.slaLowHours ?? 168)); break;
  }

  const newIncident = await db.incident.create({
    data: {
      title,
      description,
      type: type as any,
      severity: effectiveSeverity,
      reporterId: session.user.id,
      assetId: assetId || null,
      status: 'NEW',
      targetSlaDate,
      tags
    }
  })

  // Phase 7: SOAR Automations
  if (severity === 'CRITICAL' && assetId) {
    const affectedAsset = await db.asset.update({
      where: { id: assetId },
      data: { status: 'COMPROMISED' }
    })
    
    // Core Plugin Registry Hook
    await fireHook("onAssetCompromise", affectedAsset)

    if (settings?.smtpTriggerOnAssetCompromise) {
      const admins = await db.user.findMany({ where: { customRoles: { some: { permissions: { hasSome: ['VIEW_INCIDENTS_ALL', 'UPDATE_SYSTEM_SETTINGS'] } } }, email: { not: null } }, select: { id: true, email: true } })
      await sendAssetCompromisedEmail(affectedAsset.name, affectedAsset.ipAddress || '', admins.map(a => a.email as string))
      await dispatchMassAlert(admins.map(a => a.id), "ASSET_COMPROMISE", "ASSET COMPROMISED", `Asset ${affectedAsset.name} has been structurally quarantined.`, `/assets/${assetId}`)
    }
    
    await db.auditLog.create({
      data: {
        action: "SOAR_AUTO_QUARANTINE",
        entityType: "Asset",
        entityId: assetId,
        userId: session.user.id,
        changes: `Asset automatically marked as COMPROMISED due to CRITICAL Incident INC-${newIncident.id.substring(0, 8).toUpperCase()} tracking.`
      }
    })
  }

  await db.auditLog.create({
    data: {
      action: "INCIDENT_CREATED",
      entityType: "Incident",
      entityId: newIncident.id,
      userId: session.user.id,
      changes: { title, severity }
    }
  })

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
