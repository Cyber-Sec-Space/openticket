import { db } from "@/lib/db"
import { IncidentStatus, Severity } from "@prisma/client"
import { PluginSystemError, PluginInputError, withPluginErrorHandling } from './errors'
import { SdkExecutionContext, IncidentData } from './sdk-types'
import { IncidentCreateSchema, IncidentUpdateSchema, IncidentSearchSchema } from './schemas'
import { z } from "zod"

const IdSchema = z.string().min(1, "ID is required");

export function createIncidentApi(ctx: SdkExecutionContext) {
  return {
    createIncident: withPluginErrorHandling(async (data: IncidentData) => {
      const id = ctx.requireBotUser('CREATE_INCIDENTS');
      
      const parsedData = IncidentCreateSchema.parse(data);
      
      let slaHours: number | null = null;
      const settings = await db.systemSetting.findFirst();
      const effectiveSeverity = parsedData.severity as Severity;
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
          title: parsedData.title,
          description: parsedData.description,
          type: parsedData.type,
          severity: effectiveSeverity,
          ...(parsedData.assetIds && parsedData.assetIds.length > 0 ? {
            assets: {
              connect: parsedData.assetIds.filter(id => id !== 'NONE').map(id => ({ id }))
            }
          } : {}),
          status: 'NEW',
          targetSlaDate: null,
          tags: parsedData.tags,
          reporter: { connect: { id } }
        }
      });

      await db.auditLog.create({
        data: { action: `[PLUGIN:${ctx.pluginId}] INCIDENT_CREATED`, entityType: 'Incident', entityId: newInc.id, userId: id, changes: { title: parsedData.title, severity: effectiveSeverity } }
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
      const validId = IdSchema.parse(id);
      return await db.incident.findUnique({ where: { id: validId }});
    }),

    updateIncidentStatus: withPluginErrorHandling(async (id: string, status: IncidentStatus, comment?: string) => {
      const botId = ctx.requireBotUser(); 
      
      if (status === 'RESOLVED') ctx.requireBotUser('UPDATE_INCIDENT_STATUS_RESOLVE');
      else if (status === 'CLOSED') ctx.requireBotUser('UPDATE_INCIDENT_STATUS_CLOSE');
      else ctx.requireBotUser('UPDATE_INCIDENTS_METADATA');

      const validId = IdSchema.parse(id);
      z.string().parse(status);

      const updateData: any = { status };

      if (comment) {
        ctx.requireBotUser('ADD_COMMENTS');
        updateData.comments = {
          create: { content: z.string().parse(comment), authorId: botId }
        };
      }

      const updated = await db.incident.update({
        where: { id: validId },
        data: updateData
      });

      await db.auditLog.create({
        data: { action: `[PLUGIN:${ctx.pluginId}] INCIDENT_STATUS_CHANGED`, entityType: 'Incident', entityId: validId, userId: botId, changes: { status } }
      });

      if (status === 'RESOLVED') {
        await ctx.triggerHook('onIncidentResolved', updated);
      } else {
        await ctx.triggerHook('onIncidentUpdated', updated);
      }
      return updated;
    }),

    updateIncidentDetails: withPluginErrorHandling(async (incidentId: string, updates: { title?: string, description?: string, severity?: Severity, assetIds?: string[] }) => {
      const id = ctx.requireBotUser('UPDATE_INCIDENTS_METADATA');
      const validId = IdSchema.parse(incidentId);
      const parsedUpdates = IncidentUpdateSchema.parse(updates);

      const dataToUpdate: any = { ...parsedUpdates };
      if (parsedUpdates.assetIds) {
        dataToUpdate.assets = {
          set: parsedUpdates.assetIds.filter(aid => aid !== 'NONE').map(aid => ({ id: aid }))
        };
        delete dataToUpdate.assetIds;
      }

      const updated = await db.incident.update({
        where: { id: validId },
        data: {
          ...dataToUpdate
        }
      });

      await db.auditLog.create({
        data: { action: `[PLUGIN:${ctx.pluginId}] INCIDENT_UPDATED`, entityType: 'Incident', entityId: validId, userId: id, changes: parsedUpdates }
      });
      
      await ctx.triggerHook('onIncidentUpdated', updated);
      return updated;
    }),

    assignIncident: withPluginErrorHandling(async (incidentId: string, targetUserId: string) => {
      const id = ctx.requireBotUser('ASSIGN_INCIDENTS_OTHERS');
      const validIncId = IdSchema.parse(incidentId);
      const validUserId = IdSchema.parse(targetUserId);

      const targetUser = await db.user.findUnique({ where: { id: validUserId }});
      if (!targetUser) throw new PluginSystemError(`SDK Relation Error: Target user '${validUserId}' does not exist.`);

      const updated = await db.incident.update({
        where: { id: validIncId },
        data: { 
          assignees: { connect: { id: validUserId } }
        }
      });

      await db.auditLog.create({
        data: { action: `[PLUGIN:${ctx.pluginId}] INCIDENT_ASSIGNED`, entityType: 'Incident', entityId: validIncId, userId: id, changes: { targetUserId: validUserId } }
      });
      
      await ctx.triggerHook('onIncidentUpdated', updated);
      return updated;
    }),

    unassignIncident: withPluginErrorHandling(async (incidentId: string, targetUserId: string) => {
      const id = ctx.requireBotUser('ASSIGN_INCIDENTS_OTHERS');
      const validIncId = IdSchema.parse(incidentId);
      const validUserId = IdSchema.parse(targetUserId);

      const updated = await db.incident.update({
         where: { id: validIncId },
         data: { 
           assignees: { disconnect: { id: validUserId } }
         }
      });

      await db.auditLog.create({
        data: { action: `[PLUGIN:${ctx.pluginId}] INCIDENT_UNASSIGNED`, entityType: 'Incident', entityId: validIncId, userId: id, changes: { targetUserId: validUserId } }
      });
      
      await ctx.triggerHook('onIncidentUpdated', updated);
      return updated;
    }),

    manageIncidentTags: withPluginErrorHandling(async (incidentId: string, tag: string, action: 'add' | 'remove') => {
      const id = ctx.requireBotUser('UPDATE_INCIDENTS_METADATA');
      const validId = IdSchema.parse(incidentId);
      const validTag = z.string().min(1).parse(tag);
      const validAction = z.enum(['add', 'remove']).parse(action);

      const incident = await db.incident.findUnique({ where: { id: validId }});
      if (!incident) throw new PluginSystemError("SDK Relation Error: Incident not found.");

      let newTags = [...incident.tags];
      if (validAction === 'add' && !newTags.includes(validTag)) newTags.push(validTag);
      if (validAction === 'remove') newTags = newTags.filter(t => t !== validTag);

      const updated = await db.incident.update({
        where: { id: validId },
        data: { 
          tags: newTags
        }
      });

      await db.auditLog.create({
        data: { action: `[PLUGIN:${ctx.pluginId}] INCIDENT_TAGS_MODIFIED`, entityType: 'Incident', entityId: validId, userId: id, changes: { tags: newTags } }
      });
      
      await ctx.triggerHook('onIncidentUpdated', updated);
      return updated;
    }),

    searchOpenIncidents: withPluginErrorHandling(async (query?: { severity?: Severity, tags?: string[], limit?: number }) => {
      ctx.requireBotUser('VIEW_INCIDENTS_ALL');
      const parsedQuery = query ? IncidentSearchSchema.parse(query) : { limit: 50 };
      
      const conditions: any = { status: { notIn: ['RESOLVED', 'CLOSED'] } };
      
      if (parsedQuery.severity) conditions.severity = parsedQuery.severity;
      if (parsedQuery.tags && parsedQuery.tags.length > 0) conditions.tags = { hasSome: parsedQuery.tags };

      return await db.incident.findMany({
        where: conditions,
        take: parsedQuery.limit
      });
    }),

    deleteIncident: withPluginErrorHandling(async (id: string) => {
      const userId = ctx.requireBotUser('DELETE_INCIDENTS');
      const validId = IdSchema.parse(id);
      
      const [del] = await db.$transaction([
        db.incident.delete({ where: { id: validId } }),
        db.auditLog.create({
          data: { action: `[PLUGIN:${ctx.pluginId}] ENTITY_DELETED`, entityType: "Incident", entityId: validId, userId, changes: { status: "PURGED" } }
        })
      ]);
      await ctx.triggerHook('onIncidentDestroyed', validId);
      return del;
    }),

    linkIncidentToAsset: withPluginErrorHandling(async (incidentId: string, assetId: string) => {
      const id = ctx.requireBotUser('LINK_INCIDENT_TO_ASSET');
      const validIncId = IdSchema.parse(incidentId);
      const validAssetId = IdSchema.parse(assetId);

      const asset = await db.asset.findUnique({ where: { id: validAssetId } });
      const incident = await db.incident.findUnique({ where: { id: validIncId } });
      if (!asset || !incident) throw new PluginSystemError("SDK Relation Error: Provided Incident or Asset does not exist.");

      const updated = await db.incident.update({
        where: { id: validIncId },
        data: { 
          assets: { connect: { id: validAssetId } }
        }
      });

      await db.auditLog.create({
        data: { action: `[PLUGIN:${ctx.pluginId}] INCIDENT_LINKED_TO_ASSET`, entityType: 'Incident', entityId: validIncId, userId: id, changes: { assetId: validAssetId } }
      });
      
      await ctx.triggerHook('onIncidentUpdated', updated);
      return updated;
    }),

    attachEvidenceToIncident: withPluginErrorHandling(async (incidentId: string, filename: string, fileUrl: string) => {
      const id = ctx.requireBotUser('UPLOAD_INCIDENT_ATTACHMENTS');
      const validIncId = IdSchema.parse(incidentId);
      const validFileName = z.string().min(1).parse(filename);
      const validUrl = z.string().url().parse(fileUrl);

      const [attachment] = await db.$transaction([
        db.attachment.create({
          data: { filename: validFileName, fileUrl: validUrl, incidentId: validIncId, uploaderId: id }
        }),
        db.auditLog.create({
          data: { action: `[PLUGIN:${ctx.pluginId}] EVIDENCE_ATTACHED`, entityType: "Incident", entityId: validIncId, userId: id, changes: { filename: validFileName } }
        })
      ]);
      
      await ctx.triggerHook('onEvidenceAttached', attachment);
      return attachment;
    }),

    deleteIncidentAttachment: withPluginErrorHandling(async (attachmentId: string) => {
      const id = ctx.requireBotUser('DELETE_INCIDENT_ATTACHMENTS');
      const validAttachId = IdSchema.parse(attachmentId);

      const [deleted] = await db.$transaction([
        db.attachment.delete({ where: { id: validAttachId } }),
        db.auditLog.create({
           data: { action: `[PLUGIN:${ctx.pluginId}] INCIDENT_ATTACHMENT_DELETED`, entityType: "Attachment", entityId: validAttachId, userId: id, changes: { status: "purged" } }
        })
      ]);
      return deleted;
    }),
    
    addComment: withPluginErrorHandling(async (incidentId: string, content: string) => {
      const id = ctx.requireBotUser('ADD_COMMENTS');
      const validIncId = IdSchema.parse(incidentId);
      const validContent = z.string().min(1).parse(content);

      const comment = await db.comment.create({
        data: { content: validContent, incidentId: validIncId, authorId: id }
      });
      await ctx.triggerHook('onCommentAdded', comment);
      return comment;
    })
  }
}

