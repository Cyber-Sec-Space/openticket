import { db } from "@/lib/db"
import { Severity, VulnStatus, VulnAssetStatus } from "@prisma/client"
import { PluginSystemError, PluginInputError } from './errors'
import { SdkExecutionContext } from './sdk-types'

export function createVulnerabilityApi(ctx: SdkExecutionContext) {
  return {
    reportVulnerability: async (title: string, description: string, severity: Severity, targetAssetId: string, options?: { cveId?: string, cvssScore?: number }) => {
      const id = ctx.requireBotUser('CREATE_VULNERABILITIES');
      
      if (!title || !description || !targetAssetId) throw new PluginInputError("SDK Input Exception: Title, description, and targetAssetId are required.");

      try {
        const asset = await db.asset.findUnique({ where: { id: targetAssetId } });
        if (!asset) throw new PluginSystemError(`SDK Relation Error: Assigned targetAssetId '${targetAssetId}' does not exist.`);

        const settings = await db.systemSetting.findUnique({ where: { id: "global" } });
        let slaHours: number | null = null;
        switch (severity) {
          case 'CRITICAL': slaHours = settings?.vulnSlaCriticalHours ?? 12; break;
          case 'HIGH':     slaHours = settings?.vulnSlaHighHours ?? 48; break;
          case 'MEDIUM':   slaHours = settings?.vulnSlaMediumHours ?? 168; break;
          case 'LOW':      slaHours = settings?.vulnSlaLowHours ?? 336; break;
          default:         slaHours = null; break;
        }

        let vuln = await db.vulnerability.create({
          data: {
            title, description, severity, status: 'OPEN',
            cveId: options?.cveId || null,
            cvssScore: options?.cvssScore || null,
            targetSlaDate: null,
            vulnerabilityAssets: { create: { assetId: targetAssetId, status: 'AFFECTED' } }
          }
        });

        if (slaHours !== null) {
          await db.$executeRaw`UPDATE "Vulnerability" SET "targetSlaDate" = NOW() + (${slaHours} * INTERVAL '1 hour') WHERE id = ${vuln.id}`;
          vuln = await db.vulnerability.findUnique({ where: { id: vuln.id } }) as any;
        }

        await db.auditLog.create({
          data: { action: `[PLUGIN:${ctx.pluginId}] VULNERABILITY_REPORTED`, entityType: "Vulnerability", entityId: vuln.id, userId: id, changes: { title, targetAssetId, severity, cveId: options?.cveId } }
        });

        await ctx.triggerHook('onVulnerabilityCreated', vuln);
        return vuln;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    getVulnerability: async (vulnId: string) => {
      ctx.requireBotUser('VIEW_VULNERABILITIES');
      if (!vulnId) throw new PluginInputError("SDK Input Exception: vulnId required.");
      
      try {
        return await db.vulnerability.findUnique({ where: { id: vulnId }, include: { vulnerabilityAssets: true } });
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    searchVulnerabilities: async (query?: { severity?: Severity, status?: VulnStatus, limit?: number }) => {
      ctx.requireBotUser('VIEW_VULNERABILITIES');
      try {
        const limit = Math.min(query?.limit || 50, 100);
        const conditions: any = {};
        if (query?.severity) conditions.severity = query.severity;
        if (query?.status) conditions.status = query.status;

        return await db.vulnerability.findMany({ where: conditions, take: limit, include: { vulnerabilityAssets: true } });
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    updateVulnerabilityDetails: async (vulnId: string, updates: { title?: string, description?: string, severity?: Severity, cveId?: string | null, cvssScore?: number | null }) => {
      const id = ctx.requireBotUser('UPDATE_VULNERABILITIES');
      if (!vulnId) throw new PluginInputError("SDK Input Exception: vulnId required.");
      
      try {
        const updated = await db.vulnerability.update({
          where: { id: vulnId },
          data: updates
        });
        
        await db.auditLog.create({
           data: { action: `[PLUGIN:${ctx.pluginId}] VULNERABILITY_UPDATED`, entityType: "Vulnerability", entityId: vulnId, userId: id, changes: updates }
        });
        
        await ctx.triggerHook('onVulnerabilityUpdated', updated);
        return updated;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    updateVulnerabilityStatus: async (vulnId: string, status: VulnStatus) => {
      const id = ctx.requireBotUser('UPDATE_VULNERABILITIES');
      if (!vulnId || !status) throw new PluginInputError("SDK Input Exception: vulnId and status are required.");

      try {
        const updated = await db.vulnerability.update({
          where: { id: vulnId },
          data: { status }
        });

        await db.auditLog.create({
          data: { action: `[PLUGIN:${ctx.pluginId}] VULNERABILITY_STATUS_UPDATED`, entityType: "Vulnerability", entityId: vulnId, userId: id, changes: { status } }
        });
        
        await ctx.triggerHook('onVulnerabilityUpdated', updated);
        return updated;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    addCommentToVulnerability: async (vulnId: string, content: string) => {
      const id = ctx.requireBotUser('ADD_COMMENTS');
      if (!vulnId || !content) throw new PluginInputError("SDK Input Exception: vulnId and content required.");

      try {
        const comment = await db.comment.create({
          data: { content, vulnId, authorId: id }
        });
        await ctx.triggerHook('onCommentAdded', comment);
        return comment;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    assignVulnerability: async (vulnId: string, targetUserId: string) => {
      const id = ctx.requireBotUser('ASSIGN_VULNERABILITIES_OTHERS');
      if (!vulnId || !targetUserId) throw new PluginInputError("SDK Input Exception: vulnId and targetUserId required.");

      try {
        const targetUser = await db.user.findUnique({ where: { id: targetUserId }});
        if (!targetUser) throw new PluginSystemError(`SDK Relation Error: Target user '${targetUserId}' does not exist.`);

        const updated = await db.vulnerability.update({
          where: { id: vulnId },
          data: { assignees: { connect: { id: targetUserId } } }
        });

        await db.auditLog.create({
          data: { action: `[PLUGIN:${ctx.pluginId}] VULN_ASSIGNED`, entityType: "Vulnerability", entityId: vulnId, userId: id, changes: { targetUserId } }
        });
        
        await ctx.triggerHook('onVulnerabilityUpdated', updated);
        return updated;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    unassignVulnerability: async (vulnId: string, targetUserId: string) => {
      const id = ctx.requireBotUser('ASSIGN_VULNERABILITIES_OTHERS');
      if (!vulnId || !targetUserId) throw new PluginInputError("SDK Input Exception: vulnId and targetUserId required.");

      try {
        const updated = await db.vulnerability.update({
           where: { id: vulnId },
           data: { assignees: { disconnect: { id: targetUserId } } }
        });

        await db.auditLog.create({
          data: { action: `[PLUGIN:${ctx.pluginId}] VULNERABILITY_UNASSIGNED`, entityType: "Vulnerability", entityId: vulnId, userId: id, changes: { targetUserId } }
        });
        
        await ctx.triggerHook('onVulnerabilityUpdated', updated);
        return updated;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    linkVulnerabilityToAsset: async (vulnId: string, assetId: string) => {
      const id = ctx.requireBotUser('LINK_VULN_TO_ASSET');
      if (!vulnId || !assetId) throw new PluginInputError("SDK Input Exception: vulnId and assetId required.");

      try {
        const asset = await db.asset.findUnique({ where: { id: assetId } });
        if (!asset) throw new PluginSystemError(`SDK Relation Error: Asset '${assetId}' does not exist.`);

        const link = await db.vulnerabilityAsset.create({
          data: { vulnId, assetId, status: 'AFFECTED' }
        });

        await db.auditLog.create({
          data: { action: `[PLUGIN:${ctx.pluginId}] VULN_ASSET_LINKED`, entityType: "Vulnerability", entityId: vulnId, userId: id, changes: { assetId } }
        });
        
        const expandedVuln = await db.vulnerability.findUnique({ where: { id: vulnId }, include: { vulnerabilityAssets: true } });
        await ctx.triggerHook('onVulnerabilityUpdated', expandedVuln);
        return link;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    unlinkVulnerabilityFromAsset: async (vulnId: string, assetId: string) => {
      const id = ctx.requireBotUser('LINK_VULN_TO_ASSET');
      if (!vulnId || !assetId) throw new PluginInputError("SDK Input Exception: vulnId and assetId required.");

      try {
        const unlinked = await db.vulnerabilityAsset.delete({
          where: { vulnId_assetId: { vulnId, assetId } }
        });

        await db.auditLog.create({
          data: { action: `[PLUGIN:${ctx.pluginId}] VULN_ASSET_UNLINKED`, entityType: "Vulnerability", entityId: vulnId, userId: id, changes: { assetId } }
        });
        
        const expandedVuln = await db.vulnerability.findUnique({ where: { id: vulnId }, include: { vulnerabilityAssets: true } });
        await ctx.triggerHook('onVulnerabilityUpdated', expandedVuln);
        return unlinked;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    updateVulnerabilityAssetStatus: async (vulnId: string, assetId: string, status: VulnAssetStatus, notes?: string) => {
      const id = ctx.requireBotUser('UPDATE_VULNERABILITIES');
      if (!vulnId || !assetId || !status) throw new PluginInputError("SDK Input Exception: vulnId, assetId, and status required.");

      try {
        const updated = await db.vulnerabilityAsset.update({
          where: { vulnId_assetId: { vulnId, assetId } },
          data: { status, notes }
        });

        await db.auditLog.create({
          data: { action: `[PLUGIN:${ctx.pluginId}] VULN_ASSET_STATUS_UPDATED`, entityType: "Vulnerability", entityId: vulnId, userId: id, changes: { assetId, status, notes } }
        });
        
        const expandedVuln = await db.vulnerability.findUnique({ where: { id: vulnId }, include: { vulnerabilityAssets: true } });
        await ctx.triggerHook('onVulnerabilityUpdated', expandedVuln);
        return updated;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    deleteVulnerability: async (id: string) => {
      const userId = ctx.requireBotUser('DELETE_VULNERABILITIES');
      if (!id || typeof id !== 'string') throw new PluginInputError("SDK Input Exception: ID must be a string");
      
      try {
        await db.auditLog.create({
           data: { action: `[PLUGIN:${ctx.pluginId}] ENTITY_DELETED`, entityType: "Vulnerability", entityId: id, userId, changes: { status: "PURGED" } }
        });
        const del = await db.vulnerability.delete({ where: { id } });
        await ctx.triggerHook('onVulnerabilityDestroyed', id);
        return del;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    attachEvidenceToVulnerability: async (vulnId: string, filename: string, fileUrl: string) => {
      const id = ctx.requireBotUser('UPLOAD_VULN_ATTACHMENTS');
      if (!vulnId || !filename || !fileUrl) throw new PluginInputError("SDK Input Exception: VulnId, filename, and fileUrl are required.");

      try {
        const attachment = await db.attachment.create({
          data: { filename, fileUrl, vulnId, uploaderId: id }
        });

        await db.auditLog.create({
          data: { action: `[PLUGIN:${ctx.pluginId}] EVIDENCE_ATTACHED`, entityType: "Vulnerability", entityId: vulnId, userId: id, changes: { filename } }
        });
        
        await ctx.triggerHook('onEvidenceAttached', attachment);
        return attachment;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    deleteVulnerabilityAttachment: async (attachmentId: string) => {
       const id = ctx.requireBotUser('DELETE_VULN_ATTACHMENTS');
       if (!attachmentId) throw new PluginInputError("SDK Input Exception: attachmentId required.");

       try {
         const deleted = await db.attachment.delete({ where: { id: attachmentId } });
         await db.auditLog.create({
            data: { action: `[PLUGIN:${ctx.pluginId}] VULN_ATTACHMENT_DELETED`, entityType: "Attachment", entityId: attachmentId, userId: id, changes: { "status": "purged" } }
         });
         return deleted;
       } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    }
  }
}
