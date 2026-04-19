import { db } from "@/lib/db"
import { getGlobalSettings, invalidateGlobalSettings } from "@/lib/settings";
import { encryptString } from "@/lib/plugins/crypto"

export interface SystemConfigPayload {
  allowRegistration?: boolean;
  allowPasswordReset?: boolean;
  requireGlobal2FA?: boolean;
  requireEmailVerification?: boolean;
  systemPlatformUrl?: string;
  defaultRoleName?: string;
  
  webhookEnabled?: boolean;
  webhookUrl?: string;

  slaCriticalHours?: number;
  slaHighHours?: number;
  slaMediumHours?: number;
  slaLowHours?: number;
  slaInfoHours?: number;

  vulnSlaCriticalHours?: number;
  vulnSlaHighHours?: number;
  vulnSlaMediumHours?: number;
  vulnSlaLowHours?: number;
  vulnSlaInfoHours?: number;

  rateLimitEnabled?: boolean;
  rateLimitWindowMs?: number;
  rateLimitMaxAttempts?: number;

  mailerProvider?: "SMTP" | "RESEND" | "SENDGRID";
  mailerApiKeyRaw?: string | null;
  smtpEnabled?: boolean;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPasswordRaw?: string | null;
  smtpFrom?: string | null;

  smtpTriggerOnCritical?: boolean;
  smtpTriggerOnHigh?: boolean;
  smtpTriggerOnAssign?: boolean;
  smtpTriggerOnResolution?: boolean;
  smtpTriggerOnAssetCompromise?: boolean;
  smtpTriggerOnNewUser?: boolean;
  smtpTriggerOnNewVulnerability?: boolean;

  soarAutoQuarantineEnabled?: boolean;
  soarAutoQuarantineThreshold?: any;
}

export class SystemConfigService {
  /**
   * Upserts the global system settings, recalculates retroactive SLAs if necessary,
   * handles email verification grandfathering, and invalidates the cache.
   */
  static async updateSettings(userId: string, payload: SystemConfigPayload) {
    const currentSettings = await getGlobalSettings()
    const wasEmailVerificationRequired = currentSettings?.requireEmailVerification ?? false

    let rolePayload: any = undefined
    if (payload.defaultRoleName === "NONE") {
      rolePayload = { set: [] }
    } else if (payload.defaultRoleName) {
      const role = await db.customRole.findUnique({ where: { name: payload.defaultRoleName } })
      if (role) {
        rolePayload = { set: [{ id: role.id }] }
      }
    }

    let passwordPayload: any = undefined
    if (payload.smtpPasswordRaw === "<CLEAR>") {
      passwordPayload = { smtpPassword: null }
    } else if (payload.smtpPasswordRaw) {
      passwordPayload = { smtpPassword: encryptString(payload.smtpPasswordRaw) }
    }

    let mailerApiKeyPayload: any = undefined
    if (payload.mailerApiKeyRaw === "<CLEAR>") {
      mailerApiKeyPayload = { mailerApiKey: null }
    } else if (payload.mailerApiKeyRaw) {
      mailerApiKeyPayload = { mailerApiKey: encryptString(payload.mailerApiKeyRaw) }
    }

    const dataPayload = {
      allowRegistration: payload.allowRegistration,
      allowPasswordReset: payload.allowPasswordReset,
      requireGlobal2FA: payload.requireGlobal2FA,
      requireEmailVerification: payload.requireEmailVerification,
      systemPlatformUrl: payload.systemPlatformUrl,
      webhookEnabled: payload.webhookEnabled,
      webhookUrl: payload.webhookUrl,
      
      slaCriticalHours: payload.slaCriticalHours,
      slaHighHours: payload.slaHighHours,
      slaMediumHours: payload.slaMediumHours,
      slaLowHours: payload.slaLowHours,
      slaInfoHours: payload.slaInfoHours,
      
      vulnSlaCriticalHours: payload.vulnSlaCriticalHours,
      vulnSlaHighHours: payload.vulnSlaHighHours,
      vulnSlaMediumHours: payload.vulnSlaMediumHours,
      vulnSlaLowHours: payload.vulnSlaLowHours,
      vulnSlaInfoHours: payload.vulnSlaInfoHours,
      
      rateLimitEnabled: payload.rateLimitEnabled,
      rateLimitWindowMs: payload.rateLimitWindowMs,
      rateLimitMaxAttempts: payload.rateLimitMaxAttempts,
      
      mailerProvider: payload.mailerProvider,
      smtpEnabled: payload.smtpEnabled,
      smtpHost: payload.smtpHost,
      smtpPort: payload.smtpPort,
      smtpUser: payload.smtpUser,
      smtpFrom: payload.smtpFrom,
      
      smtpTriggerOnCritical: payload.smtpTriggerOnCritical,
      smtpTriggerOnHigh: payload.smtpTriggerOnHigh,
      smtpTriggerOnAssign: payload.smtpTriggerOnAssign,
      smtpTriggerOnResolution: payload.smtpTriggerOnResolution,
      smtpTriggerOnAssetCompromise: payload.smtpTriggerOnAssetCompromise,
      smtpTriggerOnNewUser: payload.smtpTriggerOnNewUser,
      smtpTriggerOnNewVulnerability: payload.smtpTriggerOnNewVulnerability,
      
      soarAutoQuarantineEnabled: payload.soarAutoQuarantineEnabled,
      soarAutoQuarantineThreshold: payload.soarAutoQuarantineThreshold
    }

    // Strip undefined keys from dataPayload so we don't accidentally overwrite with undefined
    const cleanPayload = Object.fromEntries(
      Object.entries(dataPayload).filter(([_, v]) => v !== undefined)
    );

    const updateData = {
      ...cleanPayload,
      ...(rolePayload ? { defaultUserRoles: rolePayload } : {}),
      ...(passwordPayload ? passwordPayload : {}),
      ...(mailerApiKeyPayload ? mailerApiKeyPayload : {})
    };

    const createData = {
      id: "global",
      ...cleanPayload,
      ...(rolePayload ? { defaultUserRoles: { connect: rolePayload.set } } : {}),
      ...(passwordPayload ? passwordPayload : {}),
      ...(mailerApiKeyPayload ? mailerApiKeyPayload : {})
    };

    await db.systemSetting.upsert({
      where: { id: "global" },
      update: updateData as any,
      create: createData as any
    })

    await this.grandfatherEmailVerification(wasEmailVerificationRequired, !!payload.requireEmailVerification, userId);

    await db.auditLog.create({
      data: {
        action: "UPDATE",
        entityType: "SYSTEM_SETTINGS",
        entityId: "global",
        userId,
        changes: { details: "Global system configuration and security settings updated." }
      }
    })

    invalidateGlobalSettings();

    const { fireHook } = await import("@/lib/plugins/hook-engine");
    const updatedSettings = await getGlobalSettings();
    await fireHook("onSystemSettingsUpdated", updatedSettings);

    await this.retroactiveSlaRecalculation(payload);
  }

  private static async grandfatherEmailVerification(wasRequired: boolean, isRequired: boolean, userId: string) {
    if (!wasRequired && isRequired) {
      await db.user.updateMany({
        where: { emailVerified: null },
        data: { emailVerified: new Date() }
      })
      
      await db.auditLog.create({
        data: {
          action: "UPDATE",
          entityType: "USER",
          entityId: "all_unverified_users",
          userId,
          changes: { details: "Automatically verified unverified users due to system setting change (Email Verification enforced)." }
        }
      })
    }
  }

  private static async retroactiveSlaRecalculation(payload: SystemConfigPayload) {
    try {
      await Promise.all([
        db.$executeRaw`
          UPDATE "Incident"
          SET "targetSlaDate" = "createdAt" + (
            CASE "severity"::text
              WHEN 'CRITICAL' THEN ${payload.slaCriticalHours || 4}::int * INTERVAL '1 hour'
              WHEN 'HIGH'     THEN ${payload.slaHighHours || 24}::int * INTERVAL '1 hour'
              WHEN 'MEDIUM'   THEN ${payload.slaMediumHours || 72}::int * INTERVAL '1 hour'
              WHEN 'LOW'      THEN ${payload.slaLowHours || 168}::int * INTERVAL '1 hour'
              WHEN 'INFO'     THEN ${payload.slaInfoHours || 720}::int * INTERVAL '1 hour'
            END
          )
          WHERE "status"::text IN ('NEW', 'IN_PROGRESS', 'PENDING_INFO')
        `,
        
        db.$executeRaw`
          UPDATE "Vulnerability"
          SET "targetSlaDate" = "createdAt" + (
            CASE "severity"::text
              WHEN 'CRITICAL' THEN ${payload.vulnSlaCriticalHours || 12}::int * INTERVAL '1 hour'
              WHEN 'HIGH'     THEN ${payload.vulnSlaHighHours || 48}::int * INTERVAL '1 hour'
              WHEN 'MEDIUM'   THEN ${payload.vulnSlaMediumHours || 168}::int * INTERVAL '1 hour'
              WHEN 'LOW'      THEN ${payload.vulnSlaLowHours || 336}::int * INTERVAL '1 hour'
              WHEN 'INFO'     THEN ${payload.vulnSlaInfoHours || 720}::int * INTERVAL '1 hour'
            END
          )
          WHERE "status"::text IN ('OPEN', 'MITIGATED')
        `
      ]);
    } catch (e) {
      console.error("[SystemConfigService] Failed to retroactively update SLA dates:", e)
    }
  }
}
