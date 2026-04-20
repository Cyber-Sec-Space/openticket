import { db } from "@/lib/db"
import { Severity, VulnStatus, VulnAssetStatus } from "@prisma/client"
import { PluginSystemError, PluginInputError, withPluginErrorHandling } from './errors'
import { SdkExecutionContext } from './sdk-types'
import { VulnCreateSchema, VulnSearchSchema, VulnUpdateSchema } from './schemas'
import { z } from "zod"
import { getGlobalSettings } from "@/lib/settings";

const IdSchema = z.string().min(1, "ID is required");

export function createVulnerabilityApi(ctx: SdkExecutionContext) {
  return {
    reportVulnerability: withPluginErrorHandling(async (title: string, description: string, severity: Severity, targetAssetId: string, options?: { cveId?: string, cvssScore?: number }) => {
      const id = ctx.requireBotUser('CREATE_VULNERABILITIES');
      
      const parsedData = VulnCreateSchema.parse({ title, description, severity, targetAssetId, options });

      const asset = await db.asset.findUnique({ where: { id: parsedData.targetAssetId } });
      if (!asset) throw new PluginSystemError(`SDK Relation Error: Assigned targetAssetId '${parsedData.targetAssetId}' does not exist.`);

      const settings = await getGlobalSettings();
      let slaHours: number | null = null;
      switch (parsedData.severity) {
        case 'CRITICAL': slaHours = settings?.vulnSlaCriticalHours ?? 12; break;
        case 'HIGH':     slaHours = settings?.vulnSlaHighHours ?? 48; break;
        case 'MEDIUM':   slaHours = settings?.vulnSlaMediumHours ?? 168; break;
        case 'LOW':      slaHours = settings?.vulnSlaLowHours ?? 336; break;
        default:         slaHours = null; break;
      }

      let vuln = await db.vulnerability.create({
        data: {
          title: parsedData.title, 
          description: parsedData.description, 
          severity: parsedData.severity as Severity, 
          status: 'OPEN',
          cveId: parsedData.options?.cveId || null,
          cvssScore: parsedData.options?.cvssScore || null,
          targetSlaDate: null,
          vulnerabilityAssets: { create: { asset: { connect: { id: parsedData.targetAssetId } }, status: 'AFFECTED' } }
        }
      });

      await db.auditLog.create({
        data: { action: `[PLUGIN:${ctx.pluginId}] VULNERABILITY_REPORTED`, entityType: 'Vulnerability', entityId: vuln.id, userId: id, changes: { title: parsedData.title, targetAssetId: parsedData.targetAssetId, severity: parsedData.severity, cveId: parsedData.options?.cveId } }
      });

      if (slaHours !== null) {
        await db.$executeRaw`UPDATE "Vulnerability" SET "targetSlaDate" = NOW() + (${slaHours} * INTERVAL '1 hour') WHERE id = ${vuln.id}`;
        const updatedVuln = await db.vulnerability.findUnique({ where: { id: vuln.id } });
        if (updatedVuln) vuln = updatedVuln;
      }

      await ctx.triggerHook('onVulnerabilityCreated', vuln);
      return vuln;
    }),

    getVulnerability: withPluginErrorHandling(async (vulnId: string) => {
      ctx.requireBotUser('VIEW_VULNERABILITIES');
      const validId = IdSchema.parse(vulnId);
      
      return await db.vulnerability.findUnique({ where: { id: validId }, include: { vulnerabilityAssets: true } });
    }),

    searchVulnerabilities: withPluginErrorHandling(async (query?: { severity?: Severity, status?: VulnStatus, limit?: number }) => {
      ctx.requireBotUser('VIEW_VULNERABILITIES');
      const parsedQuery = query ? VulnSearchSchema.parse(query) : { limit: 50 };
      
      const conditions: any = {};
      if (parsedQuery.severity) conditions.severity = parsedQuery.severity;
      if (parsedQuery.status) conditions.status = parsedQuery.status;

      return await db.vulnerability.findMany({ where: conditions, take: parsedQuery.limit, include: { vulnerabilityAssets: true } });
    }),

    updateVulnerabilityDetails: withPluginErrorHandling(async (vulnId: string, updates: { title?: string, description?: string, severity?: Severity, cveId?: string | null, cvssScore?: number | null }) => {
      const id = ctx.requireBotUser('UPDATE_VULNERABILITIES');
      const validId = IdSchema.parse(vulnId);
      const parsedUpdates = VulnUpdateSchema.parse(updates);
      
      const updated = await db.vulnerability.update({
        where: { id: validId },
        data: {
          ...parsedUpdates
        }
      });

      await db.auditLog.create({
        data: { action: `[PLUGIN:${ctx.pluginId}] VULNERABILITY_UPDATED`, entityType: 'Vulnerability', entityId: validId, userId: id, changes: parsedUpdates }
      });
      
      await ctx.triggerHook('onVulnerabilityUpdated', updated);
      return updated;
    }),

    updateVulnerabilityStatus: withPluginErrorHandling(async (vulnId: string, status: VulnStatus) => {
      const id = ctx.requireBotUser('UPDATE_VULNERABILITIES');
      const validId = IdSchema.parse(vulnId);
      z.string().min(1).parse(status);

      const updated = await db.vulnerability.update({
        where: { id: validId },
        data: { 
          status
        }
      });

      await db.auditLog.create({
        data: { action: `[PLUGIN:${ctx.pluginId}] VULNERABILITY_STATUS_UPDATED`, entityType: 'Vulnerability', entityId: validId, userId: id, changes: { status } }
      });
      
      await ctx.triggerHook('onVulnerabilityUpdated', updated);
      return updated;
    }),

    addCommentToVulnerability: withPluginErrorHandling(async (vulnId: string, content: string) => {
      const id = ctx.requireBotUser('ADD_COMMENTS');
      const validId = IdSchema.parse(vulnId);
      const validContent = z.string().min(1).parse(content);

      const comment = await db.comment.create({
        data: { content: validContent, vulnId: validId, author: { connect: { id } } }
      });
      await ctx.triggerHook('onCommentAdded', comment);
      return comment;
    }),

    assignVulnerability: withPluginErrorHandling(async (vulnId: string, targetUserId: string) => {
      const id = ctx.requireBotUser('ASSIGN_VULNERABILITIES_OTHERS');
      const validVulnId = IdSchema.parse(vulnId);
      const validTargetId = IdSchema.parse(targetUserId);

      const targetUser = await db.user.findUnique({ where: { id: validTargetId }});
      if (!targetUser) throw new PluginSystemError(`SDK Relation Error: Target user '${validTargetId}' does not exist.`);

      const updated = await db.vulnerability.update({
        where: { id: validVulnId },
        data: { 
          assignees: { connect: { id: validTargetId } }
        }
      });

      await db.auditLog.create({
        data: { action: `[PLUGIN:${ctx.pluginId}] VULN_ASSIGNED`, entityType: 'Vulnerability', entityId: validVulnId, userId: id, changes: { targetUserId: validTargetId } }
      });
      
      await ctx.triggerHook('onVulnerabilityUpdated', updated);
      return updated;
    }),

    unassignVulnerability: withPluginErrorHandling(async (vulnId: string, targetUserId: string) => {
      const id = ctx.requireBotUser('ASSIGN_VULNERABILITIES_OTHERS');
      const validVulnId = IdSchema.parse(vulnId);
      const validTargetId = IdSchema.parse(targetUserId);

      const updated = await db.vulnerability.update({
         where: { id: validVulnId },
         data: { 
           assignees: { disconnect: { id: validTargetId } }
         }
      });

      await db.auditLog.create({
        data: { action: `[PLUGIN:${ctx.pluginId}] VULNERABILITY_UNASSIGNED`, entityType: 'Vulnerability', entityId: validVulnId, userId: id, changes: { targetUserId: validTargetId } }
      });
      
      await ctx.triggerHook('onVulnerabilityUpdated', updated);
      return updated;
    }),

    linkVulnerabilityToAsset: withPluginErrorHandling(async (vulnId: string, assetId: string) => {
      const id = ctx.requireBotUser('LINK_VULN_TO_ASSET');
      const validVulnId = IdSchema.parse(vulnId);
      const validAssetId = IdSchema.parse(assetId);

      const asset = await db.asset.findUnique({ where: { id: validAssetId } });
      if (!asset) throw new PluginSystemError(`SDK Relation Error: Asset '${validAssetId}' does not exist.`);

      const [link] = await db.$transaction([
        db.vulnerabilityAsset.create({
          data: { vulnerability: { connect: { id: validVulnId } }, asset: { connect: { id: validAssetId } }, status: 'AFFECTED' }
        }),
        db.auditLog.create({
          data: { action: `[PLUGIN:${ctx.pluginId}] VULN_ASSET_LINKED`, entityType: "Vulnerability", entityId: validVulnId, userId: id, changes: { assetId: validAssetId } }
        })
      ]);
      
      const expandedVuln = await db.vulnerability.findUnique({ where: { id: validVulnId }, include: { vulnerabilityAssets: true } });
      await ctx.triggerHook('onVulnerabilityUpdated', expandedVuln);
      return link;
    }),

    unlinkVulnerabilityFromAsset: withPluginErrorHandling(async (vulnId: string, assetId: string) => {
      const id = ctx.requireBotUser('LINK_VULN_TO_ASSET');
      const validVulnId = IdSchema.parse(vulnId);
      const validAssetId = IdSchema.parse(assetId);

      const [unlinked] = await db.$transaction([
        db.vulnerabilityAsset.delete({
          where: { vulnId_assetId: { vulnId: validVulnId, assetId: validAssetId } }
        }),
        db.auditLog.create({
          data: { action: `[PLUGIN:${ctx.pluginId}] VULN_ASSET_UNLINKED`, entityType: "Vulnerability", entityId: validVulnId, userId: id, changes: { assetId: validAssetId } }
        })
      ]);
      
      const expandedVuln = await db.vulnerability.findUnique({ where: { id: validVulnId }, include: { vulnerabilityAssets: true } });
      await ctx.triggerHook('onVulnerabilityUpdated', expandedVuln);
      return unlinked;
    }),

    updateVulnerabilityAssetStatus: withPluginErrorHandling(async (vulnId: string, assetId: string, status: VulnAssetStatus, notes?: string) => {
      const id = ctx.requireBotUser('UPDATE_VULNERABILITIES');
      const validVulnId = IdSchema.parse(vulnId);
      const validAssetId = IdSchema.parse(assetId);
      z.string().min(1).parse(status);

      const [updated] = await db.$transaction([
        db.vulnerabilityAsset.update({
          where: { vulnId_assetId: { vulnId: validVulnId, assetId: validAssetId } },
          data: { status, notes }
        }),
        db.auditLog.create({
          data: { action: `[PLUGIN:${ctx.pluginId}] VULN_ASSET_STATUS_UPDATED`, entityType: "Vulnerability", entityId: validVulnId, userId: id, changes: { assetId: validAssetId, status, notes } }
        })
      ]);
      
      const expandedVuln = await db.vulnerability.findUnique({ where: { id: validVulnId }, include: { vulnerabilityAssets: true } });
      await ctx.triggerHook('onVulnerabilityUpdated', expandedVuln);
      return updated;
    }),

    deleteVulnerability: withPluginErrorHandling(async (id: string) => {
      const userId = ctx.requireBotUser('DELETE_VULNERABILITIES');
      const validId = IdSchema.parse(id);
      
      const [del] = await db.$transaction([
        db.vulnerability.delete({ where: { id: validId } }),
        db.auditLog.create({
           data: { action: `[PLUGIN:${ctx.pluginId}] ENTITY_DELETED`, entityType: "Vulnerability", entityId: validId, userId, changes: { status: "PURGED" } }
        })
      ]);
      await ctx.triggerHook('onVulnerabilityDestroyed', validId);
      return del;
    }),

    attachEvidenceToVulnerability: withPluginErrorHandling(async (vulnId: string, filename: string, fileUrl: string) => {
      const id = ctx.requireBotUser('UPLOAD_VULN_ATTACHMENTS');
      const validVulnId = IdSchema.parse(vulnId);
      const validFileName = z.string().min(1).parse(filename);
      const validUrl = z.string().url().parse(fileUrl);

      const [attachment] = await db.$transaction([
        db.attachment.create({
          data: { filename: validFileName, fileUrl: validUrl, vulnId: validVulnId, uploader: { connect: { id } } }
        }),
        db.auditLog.create({
          data: { action: `[PLUGIN:${ctx.pluginId}] EVIDENCE_ATTACHED`, entityType: "Vulnerability", entityId: validVulnId, userId: id, changes: { filename: validFileName } }
        })
      ]);
      
      await ctx.triggerHook('onEvidenceAttached', attachment);
      return attachment;
    }),

    deleteVulnerabilityAttachment: withPluginErrorHandling(async (attachmentId: string) => {
       const id = ctx.requireBotUser('DELETE_VULN_ATTACHMENTS');
       const validAttachId = IdSchema.parse(attachmentId);

       const [deleted] = await db.$transaction([
         db.attachment.delete({ where: { id: validAttachId } }),
         db.auditLog.create({
            data: { action: `[PLUGIN:${ctx.pluginId}] VULN_ATTACHMENT_DELETED`, entityType: "Attachment", entityId: validAttachId, userId: id, changes: { status: "purged" } }
         })
       ]);
       return deleted;
    })
  }
}

