"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { hasPermission } from "@/lib/auth-utils"

export async function updateSystemSettings(formData: FormData) {
  const session = await auth()
  if (!session?.user || !hasPermission(session as any, 'UPDATE_SYSTEM_SETTINGS')) {
    throw new Error("Unauthorized")
  }

  // base-ui Checkbox with name="allowRegistration" will send "on" if checked, otherwise it won't be in formData
  const allowRegistration = formData.get("allowRegistration") === "on"
  const requireGlobal2FA = formData.get("requireGlobal2FA") === "on"
  const requireEmailVerification = formData.get("requireEmailVerification") === "on"
  const systemPlatformUrl = formData.get("systemPlatformUrl") as string || "http://localhost:3000"
  const defaultRoleName = formData.get("defaultRoleId") as string
  let rolePayload = undefined
  if (defaultRoleName && defaultRoleName !== "NONE") {
    const role = await db.customRole.findUnique({ where: { name: defaultRoleName } })
    if (role) {
      rolePayload = { set: [{ id: role.id }] }
    }
  }

  const webhookEnabled = formData.get("webhookEnabled") === "on"
  const webhookUrl = formData.get("webhookUrl") as string || ""

  const ptCrit = parseInt(formData.get("slaCriticalHours") as string, 10)
  const slaCriticalHours = isNaN(ptCrit) ? 4 : ptCrit
  
  const ptHigh = parseInt(formData.get("slaHighHours") as string, 10)
  const slaHighHours = isNaN(ptHigh) ? 24 : ptHigh
  
  const ptMed = parseInt(formData.get("slaMediumHours") as string, 10)
  const slaMediumHours = isNaN(ptMed) ? 72 : ptMed
  
  const ptLow = parseInt(formData.get("slaLowHours") as string, 10)
  const slaLowHours = isNaN(ptLow) ? 168 : ptLow

  // Rate Limiting Config
  const rateLimitEnabled = formData.get("rateLimitEnabled") === "on"
  
  const ptWindow = parseInt(formData.get("rateLimitWindowMs") as string, 10)
  const rateLimitWindowMs = isNaN(ptWindow) ? 900000 : ptWindow
  
  const ptMax = parseInt(formData.get("rateLimitMaxAttempts") as string, 10)
  const rateLimitMaxAttempts = isNaN(ptMax) ? 5 : ptMax

  // SMTP Settings
  const smtpEnabled = formData.get("smtpEnabled") === "on"
  const smtpHost = formData.get("smtpHost") as string || null
  const smtpPortStr = formData.get("smtpPort") as string
  const parsedPort = parseInt(smtpPortStr, 10)
  const smtpPort = smtpPortStr && !isNaN(parsedPort) ? parsedPort : null
  const smtpUser = formData.get("smtpUser") as string || null
  const smtpPasswordRaw = formData.get("smtpPassword") as string || null
  const smtpFrom = formData.get("smtpFrom") as string || null

  const smtpTriggerOnCritical = formData.get("smtpTriggerOnCritical") === "on"
  const smtpTriggerOnHigh = formData.get("smtpTriggerOnHigh") === "on"
  const smtpTriggerOnAssign = formData.get("smtpTriggerOnAssign") === "on"
  const smtpTriggerOnResolution = formData.get("smtpTriggerOnResolution") === "on"
  const smtpTriggerOnAssetCompromise = formData.get("smtpTriggerOnAssetCompromise") === "on"
  const smtpTriggerOnNewUser = formData.get("smtpTriggerOnNewUser") === "on"
  const smtpTriggerOnNewVulnerability = formData.get("smtpTriggerOnNewVulnerability") === "on"

  // SOAR Automations
  const soarAutoQuarantineEnabled = formData.get("soarAutoQuarantineEnabled") === "on"
  const soarAutoQuarantineThresholdRaw = formData.get("soarAutoQuarantineThreshold") as string
  const soarAutoQuarantineThreshold = (soarAutoQuarantineThresholdRaw || "CRITICAL") as any

  await db.systemSetting.upsert({
    where: { id: "global" },
    update: {
      allowRegistration,
      requireGlobal2FA,
      requireEmailVerification,
      systemPlatformUrl,
      webhookEnabled,
      webhookUrl,
      ...(rolePayload ? { defaultUserRoles: rolePayload } : {}),
      slaCriticalHours,
      slaHighHours,
      slaMediumHours,
      slaLowHours,
      rateLimitEnabled,
      rateLimitWindowMs,
      rateLimitMaxAttempts,
      smtpEnabled,
      smtpHost,
      smtpPort,
      smtpUser,
      ...(smtpPasswordRaw ? { smtpPassword: smtpPasswordRaw } : {}),
      smtpFrom,
      smtpTriggerOnCritical,
      smtpTriggerOnHigh,
      smtpTriggerOnAssign,
      smtpTriggerOnResolution,
      smtpTriggerOnAssetCompromise,
      smtpTriggerOnNewUser,
      smtpTriggerOnNewVulnerability,
      soarAutoQuarantineEnabled,
      soarAutoQuarantineThreshold
    },
    create: {
      id: "global",
      allowRegistration,
      requireGlobal2FA,
      requireEmailVerification,
      systemPlatformUrl,
      webhookEnabled,
      webhookUrl,
      ...(rolePayload ? { defaultUserRoles: { connect: rolePayload.set } } : {}),
      slaCriticalHours,
      slaHighHours,
      slaMediumHours,
      slaLowHours,
      rateLimitEnabled,
      rateLimitWindowMs,
      rateLimitMaxAttempts,
      smtpEnabled,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword: smtpPasswordRaw,
      smtpFrom,
      smtpTriggerOnCritical,
      smtpTriggerOnHigh,
      smtpTriggerOnAssign,
      smtpTriggerOnResolution,
      smtpTriggerOnAssetCompromise,
      smtpTriggerOnNewUser,
      smtpTriggerOnNewVulnerability,
      soarAutoQuarantineEnabled,
      soarAutoQuarantineThreshold
    }
  })

  const { fireHook } = await import("@/lib/plugins/hook-engine");
  const updatedSettings = await db.systemSetting.findUnique({ where: { id: "global" } });
  await fireHook("onSystemSettingsUpdated", updatedSettings);


  // Retroactively patch SLA dates for unresolved incidents and vulnerabilities
  try {
    await db.$executeRawUnsafe(`
      UPDATE "Incident"
      SET "targetSlaDate" = "createdAt" + (
        CASE "severity"::text
          WHEN 'CRITICAL' THEN $1::int * INTERVAL '1 hour'
          WHEN 'HIGH'     THEN $2::int * INTERVAL '1 hour'
          WHEN 'MEDIUM'   THEN $3::int * INTERVAL '1 hour'
          WHEN 'LOW'      THEN $4::int * INTERVAL '1 hour'
        END
      )
      WHERE "status"::text IN ('NEW', 'IN_PROGRESS', 'PENDING_INFO')
    `, slaCriticalHours, slaHighHours, slaMediumHours, slaLowHours)
    
    await db.$executeRawUnsafe(`
      UPDATE "Vulnerability"
      SET "targetSlaDate" = "createdAt" + (
        CASE "severity"::text
          WHEN 'CRITICAL' THEN $1::int * INTERVAL '1 hour'
          WHEN 'HIGH'     THEN $2::int * INTERVAL '1 hour'
          WHEN 'MEDIUM'   THEN $3::int * INTERVAL '1 hour'
          WHEN 'LOW'      THEN $4::int * INTERVAL '1 hour'
        END
      )
      WHERE "status"::text IN ('OPEN', 'MITIGATED')
    `, slaCriticalHours, slaHighHours, slaMediumHours, slaLowHours)
  } catch (e) {
    console.error("Failed to retroactively update SLA dates:", e)
  }

  revalidatePath("/system")
}
