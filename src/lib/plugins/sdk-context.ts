import { db } from "@/lib/db"

export async function initializePluginBotUser(pluginId: string, pluginName: string): Promise<string> {
  const existingBot = await db.user.findUnique({
    where: { botPluginIdentifier: pluginId },
    select: { id: true, name: true }
  })

  // If the plugin name changed, sync it
  if (existingBot && existingBot.name !== `[Bot] ${pluginName}`) {
     await db.user.update({
       where: { botPluginIdentifier: pluginId },
       data: { name: `[Bot] ${pluginName}` }
     })
  }

  if (existingBot) {
    return existingBot.id
  }

  const newBot = await db.user.create({
    data: {
      name: `[Bot] ${pluginName}`,
      isBot: true,
      botPluginIdentifier: pluginId,
      email: `${pluginId}@bot.plugin.openticket.internal`,
      // Grant automatic ADMIN-level baseline roles to bots if needed, 
      // but strictly we isolate bot permission scopes here.
      // Bot actions via the SDK ignore UI RBAC because they are bounded by SDK explicitly.
    }
  })

  return newBot.id
}

type IncidentData = {
  title: string
  description: string
  type?: any
  severity?: any
  assetId?: string
  tags?: string[]
}

export type PluginSdkContext = {
  plugin: { id: string }
  api: {
    createIncident: (data: IncidentData) => Promise<any>
    logAudit: (action: string, entityType: string, entityId: string, changes: any) => Promise<any>
  }
}

export async function createPluginContext(pluginId: string, pluginName: string): Promise<PluginSdkContext> {
  const botUserId = await initializePluginBotUser(pluginId, pluginName)

  return {
    plugin: { id: pluginId },
    api: {
      createIncident: async (data: IncidentData) => {
        let targetSlaDate = new Date()
        const effectiveSeverity = data.severity ?? 'LOW'
        
        switch (effectiveSeverity) {
          case 'CRITICAL': targetSlaDate.setHours(targetSlaDate.getHours() + 4); break;
          case 'HIGH':     targetSlaDate.setHours(targetSlaDate.getHours() + 24); break;
          case 'MEDIUM':   targetSlaDate.setHours(targetSlaDate.getHours() + 72); break;
          case 'LOW':
          default:         targetSlaDate.setHours(targetSlaDate.getHours() + 168); break;
        }

        const newInc = await db.incident.create({
          data: {
            title: data.title,
            description: data.description,
            type: data.type ?? 'OTHER',
            severity: effectiveSeverity,
            assetId: data.assetId || null,
            status: 'NEW',
            targetSlaDate,
            tags: data.tags ?? [],
            reporterId: botUserId // Forces attribution
          }
        })
        
        await db.auditLog.create({
           data: {
             action: "INCIDENT_CREATED_BY_PLUGIN",
             entityType: "Incident",
             entityId: newInc.id,
             userId: botUserId,
             changes: { title: data.title, severity: effectiveSeverity }
           }
        })

        return newInc
      },
      logAudit: async (action: string, entityType: string, entityId: string, changes: any) => {
        return db.auditLog.create({
          data: {
            action,
            entityType,
            entityId,
            userId: botUserId,
            changes
          }
        })
      }
    }
  }
}
