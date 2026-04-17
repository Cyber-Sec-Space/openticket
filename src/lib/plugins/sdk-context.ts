import { Permission } from "@prisma/client"
import { db } from "@/lib/db"
import { activePlugins } from "@/plugins"
import { PluginPermissionError } from './errors'
import { SdkExecutionContext, PluginSdkContext } from './sdk-types'

import { createIncidentApi } from './sdk-incidents'
import { createVulnerabilityApi } from './sdk-vulnerabilities'
import { createAssetApi } from './sdk-assets'
import { createUserApi } from './sdk-users'
import { createTelemetryApi } from './sdk-telemetry'

export type { PluginSdkContext } // Re-export for compatibility with other imports

async function provisionPluginBotUser(pluginId: string, customName: string, requestedPermissions: Permission[] = []): Promise<string> {
  const existingBot = await db.user.findUnique({
    where: { botPluginIdentifier: pluginId },
    select: { id: true, name: true, customRoles: { select: { id: true } } }
  })

  const roleName = `[Plugin] ${customName}`

  let roleId: string;
  const existingRole = await db.customRole.findUnique({ where: { name: roleName } });
  
  // Phase 5 Security Intersect: The plugin code can only receive permissions that its manifest formally declared!
  const pluginNode = activePlugins.find(p => p.manifest.id === pluginId);
  const allowedManifestPerms = pluginNode?.manifest?.requestedPermissions || [];
  const sanitizedPermissions = requestedPermissions.filter(p => allowedManifestPerms.includes(p));

  if (existingRole) {
    roleId = existingRole.id;
    // Fix: Allow dynamic permission upgrades/downgrades, but ONLY if it is an automated Bot Role, avoiding human Role modification exploits.
    if (existingRole.isSystem && existingRole.name.startsWith("[Plugin]")) {
       await db.customRole.update({
         where: { id: roleId },
         data: { permissions: sanitizedPermissions }
       });
    }
  } else {
    const newRole = await db.customRole.create({
      data: {
        name: roleName,
        description: `Auto-provisioned role for the ${customName} plugin bot.`,
        isSystem: true,
        permissions: sanitizedPermissions
      }
    });
    roleId = newRole.id;
  }

  // Security Boundary Fix: Only automatically apply custom roles mapping if it's not overriding existing roles arbitrarily,
  // or limit request-driven permission creep. We no longer dynamically rewrite permissions on existing roles.
  if (existingBot) {
     const needsRename = existingBot.name !== `[Bot] ${customName}`;
     const hasRole = existingBot.customRoles.some(r => r.id === roleId);
     
     if (needsRename || !hasRole) {
       await db.user.update({
         where: { botPluginIdentifier: pluginId },
         data: { 
           name: `[Bot] ${customName}`,
           customRoles: { set: [{ id: roleId }] }
         }
       });
     }
  }

  if (existingBot) {
    return existingBot.id
  }

  const newBot = await db.user.create({
    data: {
      name: `[Bot] ${customName}`,
      isBot: true,
      botPluginIdentifier: pluginId,
      email: `${pluginId}@bot.plugin.openticket.internal`,
      customRoles: { connect: { id: roleId } }
    }
  })

  return newBot.id
}

// Global In-Memory Cache for Bot Credentials Context (10s TTL)
interface BotContextCache { id: string; permissions: Permission[]; expiresAt: number; }
const __botContextCache = new Map<string, BotContextCache>();

export async function createPluginContext(pluginId: string, defaultPluginName: string): Promise<PluginSdkContext> {
  let botUserId: string | null = null;
  let botPermissions: Permission[] = [];
  
  const now = Date.now();
  const cached = __botContextCache.get(pluginId);
  
  if (cached && cached.expiresAt > now) {
    botUserId = cached.id;
    botPermissions = cached.permissions;
  } else {
    const existingBot = await db.user.findUnique({
      where: { botPluginIdentifier: pluginId },
      select: { 
        id: true,
        customRoles: { select: { permissions: true } }
      }
    });
    
    if (existingBot) {
      botUserId = existingBot.id;
      botPermissions = existingBot.customRoles.flatMap(r => r.permissions);
      __botContextCache.set(pluginId, { id: botUserId, permissions: botPermissions, expiresAt: now + 10000 });
    }
  }

  const requireBotUser = (requiredPermission?: Permission) => {
    if (!botUserId) {
      throw new PluginPermissionError("SDK Security Exception: Bot entity not initialized. Plugin must call api.initEntity() during onInstall.");
    }
    
    if (requiredPermission && !botPermissions.includes(requiredPermission)) {
      throw new PluginPermissionError(`SDK Security Exception: Permission Denied. The plugin bot account lacks the explicitly required scope '${requiredPermission}'.`);
    }
    
    return botUserId;
  };

  const triggerHook = async (event: any, payload: any) => {
    try {
      const { fireHook } = await import("./hook-engine");
      await fireHook(event, payload, pluginId);
    } catch(e) {}
  };

  const ctx: SdkExecutionContext = {
    pluginId,
    requireBotUser,
    triggerHook
  };

  /* istanbul ignore next */
  return {
    plugin: { id: pluginId },
    api: {
      initEntity: async (customName?: string, requestedPermissions: Permission[] = []) => {
        const nameToUse = customName || defaultPluginName;
        botUserId = await provisionPluginBotUser(pluginId, nameToUse, requestedPermissions);
        botPermissions = requestedPermissions;
        __botContextCache.set(pluginId, { id: botUserId, permissions: botPermissions, expiresAt: Date.now() + 10000 });
      },
      
      ...createIncidentApi(ctx),
      ...createVulnerabilityApi(ctx),
      ...createAssetApi(ctx),
      ...createUserApi(ctx),
      ...createTelemetryApi(ctx)
    }
  }
}
