import { db } from "@/lib/db"
import { IncidentStatus, Severity } from "@prisma/client"
import { PluginSystemError, PluginInputError, withPluginErrorHandling } from './errors'
import { SdkExecutionContext, IncidentData } from './sdk-types'

export function createIncidentApi(ctx: SdkExecutionContext) {
  return {
    createIncident: withPluginErrorHandling(async (data: IncidentData) => {
      const id = ctx.requireBotUser('CREATE_INCIDENTS');
      
      if (!data || typeof data !== 'object') throw new PluginInputError("SDK Input Exception: Incident payload must be an object.");
      if (!data.title || typeof data.title !== 'string') throw new PluginInputError("SDK Input Exception: Incident 'title' is required.");
      if (!data.description || typeof data.description !== 'string') throw new PluginInputError("SDK Input Exception: Incident 'description' is required.");
      
      let slaHours: number | null = null;
      const settings = await db.systemSetting.findFirst();
      const effectiveSeverity = data.severity ?? 'LOW';
      switch (effectiveSeverity) {
        case 'CRITICAL': slaHours = settings?.slaCriticalHours ?? 4; break;
        case 'HIGH':     slaHours = settings?.slaHighHours ?? 24; break;
        case 'MEDIUM':   slaHours = settings?.slaMediumHours ?? 72; break;
        case 'LOW':      slaHours = settings?.slaLowHours ?? 168; break;
        case 'INFO':
        default:         slaHours = null; break;
      }

      let newInc = await db.incident.create({
        data: {
          title: data.title,
          description: data.description,
          type: data.type ?? 'OTHER',
          severity: effectiveSeverity,
          assetId: data.assetId || null,
          status: 'NEW',
          targetSlaDate: null,
          tags: data.tags ?? [],
          reporterId: id,
          auditLogs: {
            create: { action: `[PLUGIN:${ctx.pluginId}] INCIDENT_CREATED`, userId: id, changes: { title: data.title, severity: effectiveSeverity } }
          }
        }
      });
      
      if (slaHours !== null) {
        await db.$executeRaw`UPDATE "Incident" SET "targetSlaDate" = NOW() + (${slaHours} * INTERVAL '1 hour') WHERE id = ${newInc.id}`;
        newInc = await db.incident.findUnique({ where: { id: newInc.id } }) as any;
      }
      
      await ctx.triggerHook('onIncidentCreated', newInc);
      return newInc;
    }),

    getIncident: withPluginErrorHandling(async (id: string) => {
      ctx.requireBotUser('VIEW_INCIDENTS_ALL');
      if (!id || typeof id !== 'string') throw new PluginInputError("SDK Input Exception: ID must be a string");
      return await db.incident.findUnique({ where: { id }});
    }),

    updateIncidentStatus: withPluginErrorHandling(async (id: string, status: IncidentStatus, comment?: string) => {
      const botId = ctx.requireBotUser(); 
      
      if (status === 'RESOLVED') ctx.requireBotUser('UPDATE_INCIDENT_STATUS_RESOLVE');
      else if (status === 'CLOSED') ctx.requireBotUser('UPDATE_INCIDENT_STATUS_CLOSE');
      else ctx.requireBotUser('UPDATE_INCIDENTS_METADATA');

      if (!id || typeof id !== 'string') throw new PluginInputError("SDK Input Exception: Invalid incident ID");

      const updateData: any = { status };

      if (comment) {
        ctx.requireBotUser('ADD_COMMENTS');
        updateData.comments = {
          create: { content: comment, authorId: botId }
        };
      }

      updateData.auditLogs = {
        create: { action: `[PLUGIN:${ctx.pluginId}] INCIDENT_STATUS_CHANGED`, userId: botId, changes: { status } }
      };

      const updated = await db.incident.update({
        where: { id },
        data: updateData
      });

      if (status === 'RESOLVED') {
        await ctx.triggerHook('onIncidentResolved', updated);
      } else {
        await ctx.triggerHook('onIncidentUpdated', updated);
      }
      return updated;
    }),

    updateIncidentDetails: withPluginErrorHandling(async (incidentId: string, updates: { title?: string, description?: string, severity?: Severity, assetId?: string | null }) => {
      const id = ctx.requireBotUser('UPDATE_INCIDENTS_METADATA');
      if (!incidentId) throw new PluginInputError("SDK Input Exception: IncidentId required.");

      const updated = await db.incident.update({
        where: { id: incidentId },
        data: {
          ...updates,
          auditLogs: {
            create: { action: `[PLUGIN:${ctx.pluginId}] INCIDENT_UPDATED`, userId: id, changes: updates }
          }
        }
      });
      
      await ctx.triggerHook('onIncidentUpdated', updated);
      return updated;
    }),

    assignIncident: withPluginErrorHandling(async (incidentId: string, targetUserId: string) => {
      const id = ctx.requireBotUser('ASSIGN_INCIDENTS_OTHERS');
      if (!incidentId || !targetUserId) throw new PluginInputError("SDK Input Exception: IncidentId and TargetUserId are required.");

      const targetUser = await db.user.findUnique({ where: { id: targetUserId }});
      if (!targetUser) throw new PluginSystemError(`SDK Relation Error: Target user '${targetUserId}' does not exist.`);

      const updated = await db.incident.update({
        where: { id: incidentId },
        data: { 
          assignees: { connect: { id: targetUserId } },
          auditLogs: {
            create: { action: `[PLUGIN:${ctx.pluginId}] INCIDENT_ASSIGNED`, userId: id, changes: { targetUserId } }
          }
        }
      });
      
      await ctx.triggerHook('onIncidentUpdated', updated);
      return updated;
    }),

    unassignIncident: withPluginErrorHandling(async (incidentId: string, targetUserId: string) => {
      const id = ctx.requireBotUser('ASSIGN_INCIDENTS_OTHERS');
      if (!incidentId || !targetUserId) throw new PluginInputError("SDK Input Exception: incidentId and targetUserId required.");

      const updated = await db.incident.update({
         where: { id: incidentId },
         data: { 
           assignees: { disconnect: { id: targetUserId } },
           auditLogs: {
             create: { action: `[PLUGIN:${ctx.pluginId}] INCIDENT_UNASSIGNED`, userId: id, changes: { targetUserId } }
           }
         }
      });
      
      await ctx.triggerHook('onIncidentUpdated', updated);
      return updated;
    }),

    manageIncidentTags: withPluginErrorHandling(async (incidentId: string, tag: string, action: 'add' | 'remove') => {
      const id = ctx.requireBotUser('UPDATE_INCIDENTS_METADATA');
      if (!incidentId || !tag || !['add', 'remove'].includes(action)) throw new PluginInputError("SDK Input Exception: invalid parameters.");

      const incident = await db.incident.findUnique({ where: { id: incidentId }});
      if (!incident) throw new PluginSystemError("SDK Relation Error: Incident not found.");

      let newTags = [...incident.tags];
      if (action === 'add' && !newTags.includes(tag)) newTags.push(tag);
      if (action === 'remove') newTags = newTags.filter(t => t !== tag);

      const updated = await db.incident.update({
        where: { id: incidentId },
        data: { 
          tags: newTags,
          auditLogs: {
            create: { action: `[PLUGIN:${ctx.pluginId}] INCIDENT_TAGS_MODIFIED`, userId: id, changes: { tags: newTags } }
          }
        }
      });
      
      await ctx.triggerHook('onIncidentUpdated', updated);
      return updated;
    }),

    searchOpenIncidents: withPluginErrorHandling(async (query?: { severity?: Severity, tags?: string[], limit?: number }) => {
      ctx.requireBotUser('VIEW_INCIDENTS_ALL');
      
      const limit = Math.min(query?.limit || 50, 100);
      const conditions: any = { status: { notIn: ['RESOLVED', 'CLOSED'] } };
      
      if (query?.severity) conditions.severity = query.severity;
      if (query?.tags && query.tags.length > 0) conditions.tags = { hasSome: query.tags };

      return await db.incident.findMany({
        where: conditions,
        take: limit
      });
    }),

    deleteIncident: withPluginErrorHandling(async (id: string) => {
      const userId = ctx.requireBotUser('DELETE_INCIDENTS');
      if (!id || typeof id !== 'string') throw new PluginInputError("SDK Input Exception: ID must be a string");
      
      const [del] = await db.$transaction([
        db.incident.delete({ where: { id } }),
        db.auditLog.create({
          data: { action: `[PLUGIN:${ctx.pluginId}] ENTITY_DELETED`, entityType: "Incident", entityId: id, userId, changes: { status: "PURGED" } }
        })
      ]);
      await ctx.triggerHook('onIncidentDestroyed', id);
      return del;
    }),

    linkIncidentToAsset: withPluginErrorHandling(async (incidentId: string, assetId: string) => {
      const id = ctx.requireBotUser('LINK_INCIDENT_TO_ASSET');
      if (!incidentId || !assetId) throw new PluginInputError("SDK Input Exception: incidentId and assetId required.");

      const asset = await db.asset.findUnique({ where: { id: assetId } });
      const incident = await db.incident.findUnique({ where: { id: incidentId } });
      if (!asset || !incident) throw new PluginSystemError("SDK Relation Error: Provided Incident or Asset does not exist.");

      const updated = await db.incident.update({
        where: { id: incidentId },
        data: { 
          assetId,
          auditLogs: {
            create: { action: `[PLUGIN:${ctx.pluginId}] INCIDENT_LINKED_TO_ASSET`, userId: id, changes: { assetId } }
          }
        }
      });
      
      await ctx.triggerHook('onIncidentUpdated', updated);
      return updated;
    }),

    attachEvidenceToIncident: withPluginErrorHandling(async (incidentId: string, filename: string, fileUrl: string) => {
      const id = ctx.requireBotUser('UPLOAD_INCIDENT_ATTACHMENTS');
      if (!incidentId || !filename || !fileUrl) throw new PluginInputError("SDK Input Exception: IncidentId, filename, and fileUrl are required.");

      const [attachment] = await db.$transaction([
        db.attachment.create({
          data: { filename, fileUrl, incidentId, uploaderId: id }
        }),
        db.auditLog.create({
          data: { action: `[PLUGIN:${ctx.pluginId}] EVIDENCE_ATTACHED`, entityType: "Incident", entityId: incidentId, userId: id, changes: { filename } }
        })
      ]);
      
      await ctx.triggerHook('onEvidenceAttached', attachment);
      return attachment;
    }),

    deleteIncidentAttachment: withPluginErrorHandling(async (attachmentId: string) => {
      const id = ctx.requireBotUser('DELETE_INCIDENT_ATTACHMENTS');
      if (!attachmentId) throw new PluginInputError("SDK Input Exception: attachmentId required.");

      const [deleted] = await db.$transaction([
        db.attachment.delete({ where: { id: attachmentId } }),
        db.auditLog.create({
           data: { action: `[PLUGIN:${ctx.pluginId}] INCIDENT_ATTACHMENT_DELETED`, entityType: "Attachment", entityId: attachmentId, userId: id, changes: { "status": "purged" } }
        })
      ]);
      return deleted;
    }),
    
    addComment: withPluginErrorHandling(async (incidentId: string, content: string) => {
      const id = ctx.requireBotUser('ADD_COMMENTS');
      if (!incidentId || typeof incidentId !== 'string') throw new PluginInputError("SDK Input Exception: Invalid incident ID");
      if (!content || typeof content !== 'string') throw new PluginInputError("SDK Input Exception: Content required");

      const comment = await db.comment.create({
        data: { content, incidentId, authorId: id }
      });
      await ctx.triggerHook('onCommentAdded', comment);
      return comment;
    })
  }
}
