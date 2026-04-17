"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { hasPermission } from "@/lib/auth-utils"
import { encryptString, decryptString } from "@/lib/plugins/crypto"
import nodemailer from "nodemailer"

export async function updateSystemSettings(formData: FormData) {
  try {
    const session = await auth()
  if (!session?.user || !hasPermission(session as any, 'UPDATE_SYSTEM_SETTINGS')) {
    throw new Error("Unauthorized")
  }

  // base-ui Checkbox with name="allowRegistration" will send "on" if checked, otherwise it won't be in formData
  const allowRegistration = formData.get("allowRegistration") === "on"
  const requireGlobal2FA = formData.get("requireGlobal2FA") === "on"
  const requireEmailVerification = formData.get("requireEmailVerification") === "on"
  
  let systemPlatformUrl = formData.get("systemPlatformUrl") as string || "http://localhost:3000"
  try { new URL(systemPlatformUrl); } catch { systemPlatformUrl = "http://localhost:3000"; }
  
  const defaultRoleName = formData.get("defaultRoleId") as string
  let rolePayload: any = undefined
  if (defaultRoleName === "NONE") {
    rolePayload = { set: [] }
  } else if (defaultRoleName) {
    const role = await db.customRole.findUnique({ where: { name: defaultRoleName } })
    if (role) {
      rolePayload = { set: [{ id: role.id }] }
    }
  }

  const webhookEnabled = formData.get("webhookEnabled") === "on"
  let webhookUrl = formData.get("webhookUrl") as string || ""
  if (webhookUrl) {
    try { new URL(webhookUrl); } catch { webhookUrl = ""; }
  }

  const ptCrit = parseInt(formData.get("slaCriticalHours") as string, 10)
  const slaCriticalHours = isNaN(ptCrit) ? 4 : ptCrit
  
  const ptHigh = parseInt(formData.get("slaHighHours") as string, 10)
  const slaHighHours = isNaN(ptHigh) ? 24 : ptHigh
  
  const ptMed = parseInt(formData.get("slaMediumHours") as string, 10)
  const slaMediumHours = isNaN(ptMed) ? 72 : ptMed
  
  const ptLow = parseInt(formData.get("slaLowHours") as string, 10)
  const slaLowHours = isNaN(ptLow) ? 168 : ptLow
  
  const ptInfo = parseInt(formData.get("slaInfoHours") as string, 10)
  const slaInfoHours = isNaN(ptInfo) ? 720 : ptInfo

  const ptVulnCrit = parseInt(formData.get("vulnSlaCriticalHours") as string, 10)
  const vulnSlaCriticalHours = isNaN(ptVulnCrit) ? 12 : ptVulnCrit
  
  const ptVulnHigh = parseInt(formData.get("vulnSlaHighHours") as string, 10)
  const vulnSlaHighHours = isNaN(ptVulnHigh) ? 48 : ptVulnHigh
  
  const ptVulnMed = parseInt(formData.get("vulnSlaMediumHours") as string, 10)
  const vulnSlaMediumHours = isNaN(ptVulnMed) ? 168 : ptVulnMed
  
  const ptVulnLow = parseInt(formData.get("vulnSlaLowHours") as string, 10)
  const vulnSlaLowHours = isNaN(ptVulnLow) ? 336 : ptVulnLow
  
  const ptVulnInfo = parseInt(formData.get("vulnSlaInfoHours") as string, 10)
  const vulnSlaInfoHours = isNaN(ptVulnInfo) ? 720 : ptVulnInfo

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
  
  let passwordPayload: any = undefined
  if (smtpPasswordRaw === "<CLEAR>") {
    passwordPayload = { smtpPassword: null }
  } else if (smtpPasswordRaw) {
    passwordPayload = { smtpPassword: encryptString(smtpPasswordRaw) }
  }

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

  // Detect state change for email verification
  const currentSettings = await db.systemSetting.findUnique({ where: { id: "global" } })
  const wasEmailVerificationRequired = currentSettings?.requireEmailVerification ?? false

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
      slaInfoHours,
      vulnSlaCriticalHours,
      vulnSlaHighHours,
      vulnSlaMediumHours,
      vulnSlaLowHours,
      vulnSlaInfoHours,
      rateLimitEnabled,
      rateLimitWindowMs,
      rateLimitMaxAttempts,
      smtpEnabled,
      smtpHost,
      smtpPort,
      smtpUser,
      ...(passwordPayload ? passwordPayload : {}),
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
      slaInfoHours,
      vulnSlaCriticalHours,
      vulnSlaHighHours,
      vulnSlaMediumHours,
      vulnSlaLowHours,
      vulnSlaInfoHours,
      rateLimitEnabled,
      rateLimitWindowMs,
      rateLimitMaxAttempts,
      smtpEnabled,
      smtpHost,
      smtpPort,
      smtpUser,
      ...(passwordPayload ? passwordPayload : {}),
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

  // If email verification was freshly turned ON, grandfather in all existing accounts by forcefully marking them as verified
  if (!wasEmailVerificationRequired && requireEmailVerification) {
    await db.user.updateMany({
      where: { emailVerified: null },
      data: { emailVerified: new Date() }
    })
    
    await db.auditLog.create({
      data: {
        action: "UPDATE",
        targetType: "USER",
        targetId: "all_unverified_users",
        actorId: session.user.id,
        details: "Automatically verified unverified users due to system setting change (Email Verification enforced)."
      }
    })
  }

  await db.auditLog.create({
    data: {
      action: "UPDATE",
      targetType: "SYSTEM_SETTINGS",
      targetId: "global",
      actorId: session.user.id,
      details: "Global system configuration and security settings updated."
    }
  })

  const { fireHook } = await import("@/lib/plugins/hook-engine");
  const updatedSettings = await db.systemSetting.findUnique({ where: { id: "global" } });
  await fireHook("onSystemSettingsUpdated", updatedSettings);


  // Retroactively patch SLA dates for unresolved incidents and vulnerabilities
  setTimeout(async () => {
    try {
      await db.$executeRawUnsafe(`
        UPDATE "Incident"
        SET "targetSlaDate" = "createdAt" + (
          CASE "severity"::text
            WHEN 'CRITICAL' THEN $1::int * INTERVAL '1 hour'
            WHEN 'HIGH'     THEN $2::int * INTERVAL '1 hour'
            WHEN 'MEDIUM'   THEN $3::int * INTERVAL '1 hour'
            WHEN 'LOW'      THEN $4::int * INTERVAL '1 hour'
            WHEN 'INFO'     THEN $5::int * INTERVAL '1 hour'
          END
        )
        WHERE "status"::text IN ('NEW', 'IN_PROGRESS', 'PENDING_INFO')
      `, slaCriticalHours, slaHighHours, slaMediumHours, slaLowHours, slaInfoHours)
      
      await db.$executeRawUnsafe(`
        UPDATE "Vulnerability"
        SET "targetSlaDate" = "createdAt" + (
          CASE "severity"::text
            WHEN 'CRITICAL' THEN $1::int * INTERVAL '1 hour'
            WHEN 'HIGH'     THEN $2::int * INTERVAL '1 hour'
            WHEN 'MEDIUM'   THEN $3::int * INTERVAL '1 hour'
            WHEN 'LOW'      THEN $4::int * INTERVAL '1 hour'
            WHEN 'INFO'     THEN $5::int * INTERVAL '1 hour'
          END
        )
        WHERE "status"::text IN ('OPEN', 'MITIGATED')
      `, vulnSlaCriticalHours, vulnSlaHighHours, vulnSlaMediumHours, vulnSlaLowHours, vulnSlaInfoHours)
    } catch (e) {
      console.error("Failed to retroactively update SLA dates:", e)
    }
  }, 0)

    revalidatePath("/system")
  } catch (e) {
    require('fs').writeFileSync('/tmp/open-ticket-error.log', String(e) + '\n\n' + e.stack);
    console.error("CRITICAL SETTINGS ERROR:", e)
    throw e
  }
}

export async function testSmtpConnection(formData: FormData) {
  const session = await auth()
  if (!session?.user || !hasPermission(session as any, 'UPDATE_SYSTEM_SETTINGS')) {
    return { error: "Unauthorized" }
  }

  const smtpHost = formData.get("smtpHost") as string || ""
  const smtpPortStr = formData.get("smtpPort") as string || ""
  const smtpUser = formData.get("smtpUser") as string || ""
  const smtpPasswordRaw = formData.get("smtpPassword") as string || ""
  
  if (!smtpHost) return { error: "SMTP Host is required for testing." }

  let finalPassword = smtpPasswordRaw
  if (!finalPassword) {
    // If empty, try to fetch the existing securely stored password
    const settings = await db.systemSetting.findUnique({ where: { id: "global" } })
    if (settings?.smtpPassword) {
      finalPassword = decryptString(settings.smtpPassword)
    }
  }

  const port = parseInt(smtpPortStr, 10) || 587

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: port,
      secure: port === 465,
      auth: (smtpUser || finalPassword) ? {
        user: smtpUser,
        pass: finalPassword,
      } : undefined,
      tls: {
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false"
      }
    })

    await transporter.verify()
    return { success: true }
  } catch (error: any) {
    return { error: error.message || "Connection failed to verify." }
  }
}
