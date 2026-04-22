"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { hasPermission } from "@/lib/auth-utils"
import { encryptString, decryptString } from "@/lib/plugins/crypto"
import nodemailer from "nodemailer"
import { getGlobalSettings, invalidateGlobalSettings } from "@/lib/settings";

export async function updateSystemSettings(formData: FormData) {
  try {
    const session = await auth()
  if (!session?.user || !hasPermission(session, 'UPDATE_SYSTEM_SETTINGS')) {
    throw new Error("Unauthorized")
  }

  // Extract simple fields
  const payload: any = {
    allowRegistration: formData.get("allowRegistration") === "on",
    allowPasswordReset: formData.get("allowPasswordReset") === "on",
    requireGlobal2FA: formData.get("requireGlobal2FA") === "on",
    requireEmailVerification: formData.get("requireEmailVerification") === "on",
    defaultRoleName: formData.get("defaultRoleId") as string,
    webhookEnabled: formData.get("webhookEnabled") === "on",
    rateLimitEnabled: formData.get("rateLimitEnabled") === "on",
    smtpEnabled: formData.get("smtpEnabled") === "on",
    smtpTriggerOnCritical: formData.get("smtpTriggerOnCritical") === "on",
    smtpTriggerOnHigh: formData.get("smtpTriggerOnHigh") === "on",
    smtpTriggerOnAssign: formData.get("smtpTriggerOnAssign") === "on",
    smtpTriggerOnResolution: formData.get("smtpTriggerOnResolution") === "on",
    smtpTriggerOnAssetCompromise: formData.get("smtpTriggerOnAssetCompromise") === "on",
    smtpTriggerOnNewUser: formData.get("smtpTriggerOnNewUser") === "on",
    smtpTriggerOnNewVulnerability: formData.get("smtpTriggerOnNewVulnerability") === "on",
    soarAutoQuarantineEnabled: formData.get("soarAutoQuarantineEnabled") === "on",
  }

  let systemPlatformUrl = formData.get("systemPlatformUrl") as string || "http://localhost:3000"
  try { 
    const parsed = new URL(systemPlatformUrl); 
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error();
  } catch { systemPlatformUrl = "http://localhost:3000"; }
  payload.systemPlatformUrl = systemPlatformUrl;

  let webhookUrl = formData.get("webhookUrl") as string || ""
  if (webhookUrl) {
    try { 
      const parsed = new URL(webhookUrl); 
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error();
    } catch { webhookUrl = ""; }
  }
  payload.webhookUrl = webhookUrl;

  const parseNum = (key: string, def?: number) => {
    const val = parseInt(formData.get(key) as string, 10);
    return isNaN(val) ? def : val;
  }

  payload.slaCriticalHours = parseNum("slaCriticalHours", 4);
  payload.slaHighHours = parseNum("slaHighHours", 24);
  payload.slaMediumHours = parseNum("slaMediumHours", 72);
  payload.slaLowHours = parseNum("slaLowHours", 168);
  payload.slaInfoHours = parseNum("slaInfoHours", 720);

  payload.vulnSlaCriticalHours = parseNum("vulnSlaCriticalHours", 12);
  payload.vulnSlaHighHours = parseNum("vulnSlaHighHours", 48);
  payload.vulnSlaMediumHours = parseNum("vulnSlaMediumHours", 168);
  payload.vulnSlaLowHours = parseNum("vulnSlaLowHours", 336);
  payload.vulnSlaInfoHours = parseNum("vulnSlaInfoHours", 720);

  payload.rateLimitWindowMs = parseNum("rateLimitWindowMs", 900000);
  payload.rateLimitMaxAttempts = parseNum("rateLimitMaxAttempts", 5);

  payload.mailerProvider = formData.get("mailerProvider") as any || "SMTP";
  payload.mailerApiKeyRaw = formData.get("mailerApiKey") as string || null;
  payload.smtpHost = formData.get("smtpHost") as string || null;
  payload.smtpPort = parseNum("smtpPort", null as any);
  payload.smtpUser = formData.get("smtpUser") as string || null;
  payload.smtpPasswordRaw = formData.get("smtpPassword") as string || null;
  payload.smtpFrom = formData.get("smtpFrom") as string || null;
  
  const soarThresh = formData.get("soarAutoQuarantineThreshold") as string;
  if (soarThresh) payload.soarAutoQuarantineThreshold = soarThresh;

  // Delegate strictly to the service layer
  const { SystemConfigService } = await import("@/services/system-config.service");
  await SystemConfigService.updateSettings(session.user.id, payload);

  revalidatePath("/system")
} catch (e: any) {
  require('fs').writeFileSync('/tmp/open-ticket-error.log', String(e) + '\n\n' + e.stack);
  console.error("CRITICAL SETTINGS ERROR:", e)
  throw e
}
}

export async function testSmtpConnection(formData: FormData) {
  const session = await auth()
  if (!session?.user || !hasPermission(session, 'UPDATE_SYSTEM_SETTINGS')) {
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
    const settings = await getGlobalSettings()
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
