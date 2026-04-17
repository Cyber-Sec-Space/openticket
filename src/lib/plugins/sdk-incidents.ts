import { db } from "@/lib/db"
import { IncidentStatus, Severity } from "@prisma/client"
import { PluginSystemError, PluginInputError } from './errors'
import { SdkExecutionContext, IncidentData } from './sdk-types'

export function createIncidentApi(ctx: SdkExecutionContext) {
  return {
    createIncident: async (data: IncidentData) => {
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

      try {
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
            reporterId: id
          }
        });
        
        if (slaHours !== null) {
          await db.$executeRaw`UPDATE "Incident" SET "targetSlaDate" = NOW() + (${slaHours} * INTERVAL '1 hour') WHERE id = ${newInc.id}`;
          newInc = await db.incident.findUnique({ where: { id: newInc.id } }) as any;
        }
        
        await db.auditLog.create({
           data: { action: `[PLUGIN:${ctx.pluginId}] INCIDENT_CREATED`, entityType: "Incident", entityId: newInc.id, userId: id, changes: { title: data.title, severity: effectiveSeverity } }
        });
        await ctx.triggerHook('onIncidentCreated', newInc);
        return newInc;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    getIncident: async (id: string) => {
      ctx.requireBotUser('VIEW_INCIDENTS_ALL');
      if (!id || typeof id !== 'string') throw new PluginInputError("SDK Input Exception: ID must be a string");
      
      try {
        return await db.incident.findUnique({ where: { id }});
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    updateIncidentStatus: async (id: string, status: IncidentStatus, comment?: string) => {
      const botId = ctx.requireBotUser(); 
      
      if (status === 'RESOLVED') ctx.requireBotUser('UPDATE_INCIDENT_STATUS_RESOLVE');
      else if (status === 'CLOSED') ctx.requireBotUser('UPDATE_INCIDENT_STATUS_CLOSE');
      else ctx.requireBotUser('UPDATE_INCIDENTS_METADATA');

      if (!id || typeof id !== 'string') throw new PluginInputError("SDK Input Exception: Invalid incident ID");

      try {
        const updated = await db.incident.update({
          where: { id },
          data: { status }
        });
        
        if (comment) {
          ctx.requireBotUser('ADD_COMMENTS');
          await db.comment.create({
            data: { content: comment, incidentId: id, authorId: botId }
          });
        }

        await db.auditLog.create({
          data: { action: `[PLUGIN:${ctx.pluginId}] INCIDENT_STATUS_CHANGED`, entityType: "Incident", entityId: updated.id, userId: botId, changes: { status } }
        });

        if (status === 'RESOLVED') {
          await ctx.triggerHook('onIncidentResolved', updated);
        } else {
          await ctx.triggerHook('onIncidentUpdated', updated);
        }
        return updated;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    updateIncidentDetails: async (incidentId: string, updates: { title?: string, description?: string, severity?: Severity, assetId?: string | null }) => {
      const id = ctx.requireBotUser('UPDATE_INCIDENTS_METADATA');
      if (!incidentId) throw new PluginInputError("SDK Input Exception: IncidentId required.");

      try {
        const updated = await db.incident.update({
          where: { id: incidentId },
          data: updates
        });
        
        await db.auditLog.create({
           data: { action: `[PLUGIN:${ctx.pluginId}] INCIDENT_UPDATED`, entityType: "Incident", entityId: incidentId, userId: id, changes: updates }
        });
        
        await ctx.triggerHook('onIncidentUpdated', updated);
        return updated;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    assignIncident: async (incidentId: string, targetUserId: string) => {
      const id = ctx.requireBotUser('ASSIGN_INCIDENTS_OTHERS');
      if (!incidentId || !targetUserId) throw new PluginInputError("SDK Input Exception: IncidentId and TargetUserId are required.");

      try {
        const targetUser = await db.user.findUnique({ where: { id: targetUserId }});
        if (!targetUser) throw new PluginSystemError(`SDK Relation Error: Target user '${targetUserId}' does not exist.`);

        const updated = await db.incident.update({
          where: { id: incidentId },
          data: { assignees: { connect: { id: targetUserId } } }
        });

        await db.auditLog.create({
          data: { action: `[PLUGIN:${ctx.pluginId}] INCIDENT_ASSIGNED`, entityType: "Incident", entityId: incidentId, userId: id, changes: { targetUserId } }
        });
        
        await ctx.triggerHook('onIncidentUpdated', updated);
        return updated;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    unassignIncident: async (incidentId: string, targetUserId: string) => {
      const id = ctx.requireBotUser('ASSIGN_INCIDENTS_OTHERS');
      if (!incidentId || !targetUserId) throw new PluginInputError("SDK Input Exception: incidentId and targetUserId required.");

      try {
        const updated = await db.incident.update({
           where: { id: incidentId },
           data: { assignees: { disconnect: { id: targetUserId } } }
        });

        await db.auditLog.create({
          data: { action: `[PLUGIN:${ctx.pluginId}] INCIDENT_UNASSIGNED`, entityType: "Incident", entityId: incidentId, userId: id, changes: { targetUserId } }
        });
        
        await ctx.triggerHook('onIncidentUpdated', updated);
        return updated;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    manageIncidentTags: async (incidentId: string, tag: string, action: 'add' | 'remove') => {
      const id = ctx.requireBotUser('UPDATE_INCIDENTS_METADATA');
      if (!incidentId || !tag || !['add', 'remove'].includes(action)) throw new PluginInputError("SDK Input Exception: invalid parameters.");

      try {
        const incident = await db.incident.findUnique({ where: { id: incidentId }});
        if (!incident) throw new PluginSystemError("SDK Relation Error: Incident not found.");

        let newTags = [...incident.tags];
        if (action === 'add' && !newTags.includes(tag)) newTags.push(tag);
        if (action === 'remove') newTags = newTags.filter(t => t !== tag);

        const updated = await db.incident.update({
          where: { id: incidentId },
          data: { tags: newTags }
        });

        await db.auditLog.create({
          data: { action: `[PLUGIN:${ctx.pluginId}] INCIDENT_TAGS_MODIFIED`, entityType: "Incident", entityId: incidentId, userId: id, changes: { tags: newTags } }
        });
        
        await ctx.triggerHook('onIncidentUpdated', updated);
        return updated;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    searchOpenIncidents: async (query?: { severity?: Severity, tags?: string[], limit?: number }) => {
      ctx.requireBotUser('VIEW_INCIDENTS_ALL');
      
      try {
        const limit = Math.min(query?.limit || 50, 100);
        const conditions: any = { status: { notIn: ['RESOLVED', 'CLOSED'] } };
        
        if (query?.severity) conditions.severity = query.severity;
        if (query?.tags && query.tags.length > 0) conditions.tags = { hasSome: query.tags };

        return await db.incident.findMany({
          where: conditions,
          take: limit
        });
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    deleteIncident: async (id: string) => {
      const userId = ctx.requireBotUser('DELETE_INCIDENTS');
      if (!id || typeof id !== 'string') throw new PluginInputError("SDK Input Exception: ID must be a string");
      
      try {
        await db.auditLog.create({
           data: { action: `[PLUGIN:${ctx.pluginId}] ENTITY_DELETED`, entityType: "Incident", entityId: id, userId, changes: { status: "PURGED" } }
        });
        const del = await db.incident.delete({ where: { id } });
        await ctx.triggerHook('onIncidentDestroyed', id);
        return del;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    linkIncidentToAsset: async (incidentId: string, assetId: string) => {
      const id = ctx.requireBotUser('LINK_INCIDENT_TO_ASSET');
      if (!incidentId || !assetId) throw new PluginInputError("SDK Input Exception: incidentId and assetId required.");

      try {
        const asset = await db.asset.findUnique({ where: { id: assetId } });
        const incident = await db.incident.findUnique({ where: { id: incidentId } });
        if (!asset || !incident) throw new PluginSystemError("SDK Relation Error: Provided Incident or Asset does not exist.");

        const updated = await db.incident.update({
          where: { id: incidentId },
          data: { assetId }
        });

        await db.auditLog.create({
          data: { action: `[PLUGIN:${ctx.pluginId}] INCIDENT_LINKED_TO_ASSET`, entityType: "Incident", entityId: incidentId, userId: id, changes: { assetId } }
        });
        
        await ctx.triggerHook('onIncidentUpdated', updated);
        return updated;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    attachEvidenceToIncident: async (incidentId: string, filename: string, fileUrl: string) => {
      const id = ctx.requireBotUser('UPLOAD_INCIDENT_ATTACHMENTS');
      if (!incidentId || !filename || !fileUrl) throw new PluginInputError("SDK Input Exception: IncidentId, filename, and fileUrl are required.");

      try {
        const attachment = await db.attachment.create({
          data: { filename, fileUrl, incidentId, uploaderId: id }
        });

        await db.auditLog.create({
          data: { action: `[PLUGIN:${ctx.pluginId}] EVIDENCE_ATTACHED`, entityType: "Incident", entityId: incidentId, userId: id, changes: { filename } }
        });
        
        await ctx.triggerHook('onEvidenceAttached', attachment);
        return attachment;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    deleteIncidentAttachment: async (attachmentId: string) => {
      const id = ctx.requireBotUser('DELETE_INCIDENT_ATTACHMENTS');
      if (!attachmentId) throw new PluginInputError("SDK Input Exception: attachmentId required.");

      try {
        const deleted = await db.attachment.delete({ where: { id: attachmentId } });
        await db.auditLog.create({
           data: { action: `[PLUGIN:${ctx.pluginId}] INCIDENT_ATTACHMENT_DELETED`, entityType: "Attachment", entityId: attachmentId, userId: id, changes: { "status": "purged" } }
        });
        return deleted;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },
    
    addComment: async (incidentId: string, content: string) => {
      const id = ctx.requireBotUser('ADD_COMMENTS');
      if (!incidentId || typeof incidentId !== 'string') throw new PluginInputError("SDK Input Exception: Invalid incident ID");
      if (!content || typeof content !== 'string') throw new PluginInputError("SDK Input Exception: Content required");

      try {
        const comment = await db.comment.create({
          data: { content, incidentId, authorId: id }
        });
        await ctx.triggerHook('onCommentAdded', comment);
        return comment;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    }
  }
}
