import { PluginSystemError, PluginPermissionError, PluginInputError } from './errors';
import { db } from "@/lib/db"
import { Permission, IncidentStatus, AssetType, Severity, AssetStatus, VulnStatus, VulnAssetStatus } from "@prisma/client"
import { activePlugins } from "@/plugins"

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
    initEntity: (name?: string, requestedPermissions?: Permission[]) => Promise<void>
    
    // Core Incident Logging
    createIncident: (data: IncidentData) => Promise<any>
    
    // Phase 2 SOAR Extension
    getIncident: (id: string) => Promise<any>
    updateIncidentStatus: (id: string, status: IncidentStatus, comment?: string) => Promise<any>
    addComment: (incidentId: string, content: string) => Promise<any>
    createAsset: (name: string, type: AssetType, ipAddress?: string, externalId?: string, metadata?: any) => Promise<any>
    reportVulnerability: (title: string, description: string, severity: Severity, targetAssetId: string, options?: { cveId?: string, cvssScore?: number }) => Promise<any>
    
    // Phase 3 SOAR Extension
    getUserByEmail: (email: string) => Promise<any>
    assignIncident: (incidentId: string, targetUserId: string) => Promise<any>
    updateAssetStatus: (assetId: string, status: AssetStatus) => Promise<any>
    attachEvidenceToIncident: (incidentId: string, filename: string, fileUrl: string) => Promise<any>
    attachEvidenceToVulnerability: (vulnId: string, filename: string, fileUrl: string) => Promise<any>

    // Phase 4 Context & Notification
    getAssetByIp: (ipAddress: string) => Promise<any>
    getAssetByIdentifier: (identifier: string) => Promise<any>
    updateVulnerabilityStatus: (vulnId: string, status: VulnStatus) => Promise<any>
    manageIncidentTags: (incidentId: string, tag: string, action: 'add' | 'remove') => Promise<any>
    pushNotification: (targetUserId: string, title: string, body: string, link?: string) => Promise<any>
    searchOpenIncidents: (query?: { severity?: Severity, tags?: string[], limit?: number }) => Promise<any>

    // Phase 6 Data Lifecycle & Telemetry
    deleteIncident: (id: string) => Promise<any>
    deleteAsset: (id: string) => Promise<any>
    deleteVulnerability: (id: string) => Promise<any>
    updateAssetMetadata: (assetId: string, metadataPatch: any) => Promise<any>
    logPluginMetric: (metricName: string, value: number, payload?: any) => Promise<any>

    // Phase 7 Identity Access Management (SCIM)
    createUser: (email: string, name: string, assignRoleNames?: string[]) => Promise<any>
    suspendUser: (userId: string) => Promise<any>
    assignUserRoles: (userId: string, targetRoleNames: string[]) => Promise<any>
    resetUserMfaSession: (userId: string) => Promise<any>

    // Phase 8 Operations (CRUD Parity)
    updateIncidentDetails: (incidentId: string, updates: { title?: string, description?: string, severity?: Severity, assetId?: string | null }) => Promise<any>
    
    getVulnerability: (vulnId: string) => Promise<any>
    searchVulnerabilities: (query?: { severity?: Severity, status?: VulnStatus, limit?: number }) => Promise<any>
    updateVulnerabilityDetails: (vulnId: string, updates: { title?: string, description?: string, severity?: Severity, cveId?: string | null, cvssScore?: number | null }) => Promise<any>
    addCommentToVulnerability: (vulnId: string, content: string) => Promise<any>
    assignVulnerability: (vulnId: string, targetUserId: string) => Promise<any>
    linkVulnerabilityToAsset: (vulnId: string, assetId: string) => Promise<any>
    updateVulnerabilityAssetStatus: (vulnId: string, assetId: string, status: VulnAssetStatus, notes?: string) => Promise<any>

    getAsset: (assetId: string) => Promise<any>
    searchAssets: (query?: { type?: AssetType, status?: AssetStatus, limit?: number }) => Promise<any>
    updateAssetDetails: (assetId: string, updates: { name?: string, type?: AssetType, ipAddress?: string | null, externalId?: string | null }) => Promise<any>

    // Phase 9 Disassociations & Final Cleanup Parity
    linkIncidentToAsset: (incidentId: string, assetId: string) => Promise<any>
    unassignIncident: (incidentId: string, targetUserId: string) => Promise<any>
    unassignVulnerability: (vulnId: string, targetUserId: string) => Promise<any>
    unlinkVulnerabilityFromAsset: (vulnId: string, assetId: string) => Promise<any>
    deleteComment: (commentId: string) => Promise<any>
    deleteIncidentAttachment: (attachmentId: string) => Promise<any>
    deleteVulnerabilityAttachment: (attachmentId: string) => Promise<any>

    logAudit: (action: string, entityType: string, entityId: string, changes: any) => Promise<any>
  }
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
      
      createIncident: async (data: IncidentData) => {
        const id = requireBotUser('CREATE_INCIDENTS');
        
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
          default:         slaHours = null; break; // INFO has no SLA
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
             data: { action: `[PLUGIN:${pluginId}] INCIDENT_CREATED`, entityType: "Incident", entityId: newInc.id, userId: id, changes: { title: data.title, severity: effectiveSeverity } }
          });
          await triggerHook('onIncidentCreated', newInc);
          return newInc;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      getIncident: async (id: string) => {
        requireBotUser('VIEW_INCIDENTS_ALL');
        if (!id || typeof id !== 'string') throw new PluginInputError("SDK Input Exception: ID must be a string");
        
        try {
          return await db.incident.findUnique({ where: { id }});
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      updateIncidentStatus: async (id: string, status: IncidentStatus, comment?: string) => {
        const botId = requireBotUser(); 
        
        if (status === 'RESOLVED') requireBotUser('UPDATE_INCIDENT_STATUS_RESOLVE');
        else if (status === 'CLOSED') requireBotUser('UPDATE_INCIDENT_STATUS_CLOSE');
        else requireBotUser('UPDATE_INCIDENTS_METADATA');

        if (!id || typeof id !== 'string') throw new PluginInputError("SDK Input Exception: Invalid incident ID");

        try {
          const updated = await db.incident.update({
            where: { id },
            data: { status }
          });
          
          if (comment) {
            requireBotUser('ADD_COMMENTS');
            await db.comment.create({
              data: { content: comment, incidentId: id, authorId: botId }
            });
          }

          await db.auditLog.create({
            data: { action: `[PLUGIN:${pluginId}] INCIDENT_STATUS_CHANGED`, entityType: "Incident", entityId: updated.id, userId: botId, changes: { status } }
          });

          if (status === 'RESOLVED') {
            await triggerHook('onIncidentResolved', updated);
          } else {
            await triggerHook('onIncidentUpdated', updated);
          }
          return updated;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      addComment: async (incidentId: string, content: string) => {
        const id = requireBotUser('ADD_COMMENTS');
        if (!incidentId || typeof incidentId !== 'string') throw new PluginInputError("SDK Input Exception: Invalid incident ID");
        if (!content || typeof content !== 'string') throw new PluginInputError("SDK Input Exception: Content required");

        try {
          const comment = await db.comment.create({
            data: { content, incidentId, authorId: id }
          });
          await triggerHook('onCommentAdded', comment);
          return comment;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      createAsset: async (name: string, type: AssetType, ipAddress?: string, externalId?: string, metadata?: any) => {
        const id = requireBotUser('CREATE_ASSETS');
        if (!name || typeof name !== 'string') throw new PluginInputError("SDK Input Exception: Asset name required");

        try {
          const asset = await db.asset.create({
            data: { name, type, ipAddress, externalId, metadata: metadata || {} }
          });
          
          await db.auditLog.create({
            data: { action: `[PLUGIN:${pluginId}] ASSET_CREATED`, entityType: "Asset", entityId: asset.id, userId: id, changes: { name, type, ipAddress, externalId } }
          });

          await triggerHook('onAssetCreated', asset);
          return asset;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      reportVulnerability: async (title: string, description: string, severity: Severity, targetAssetId: string, options?: { cveId?: string, cvssScore?: number }) => {
        const id = requireBotUser('CREATE_VULNERABILITIES');
        
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
            data: { action: `[PLUGIN:${pluginId}] VULNERABILITY_REPORTED`, entityType: "Vulnerability", entityId: vuln.id, userId: id, changes: { title, targetAssetId, severity, cveId: options?.cveId } }
          });

          await triggerHook('onVulnerabilityCreated', vuln);
          return vuln;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      // ======== Phase 3 Elements ========

      getUserByEmail: async (email: string) => {
        requireBotUser('VIEW_USERS');
        if (!email || typeof email !== 'string') throw new PluginInputError("SDK Input Exception: Invalid email format");

        try {
          return await db.user.findUnique({
            where: { email },
            select: { id: true, name: true, email: true, isBot: true, isDisabled: true }
          });
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      assignIncident: async (incidentId: string, targetUserId: string) => {
        const id = requireBotUser('ASSIGN_INCIDENTS_OTHERS');
        if (!incidentId || !targetUserId) throw new PluginInputError("SDK Input Exception: IncidentId and TargetUserId are required.");

        try {
          // Verify user exists first
          const targetUser = await db.user.findUnique({ where: { id: targetUserId }});
          if (!targetUser) throw new PluginSystemError(`SDK Relation Error: Target user '${targetUserId}' does not exist.`);

          const updated = await db.incident.update({
            where: { id: incidentId },
            data: { assignees: { connect: { id: targetUserId } } }
          });

          await db.auditLog.create({
            data: { action: `[PLUGIN:${pluginId}] INCIDENT_ASSIGNED`, entityType: "Incident", entityId: incidentId, userId: id, changes: { targetUserId } }
          });
          
          await triggerHook('onIncidentUpdated', updated);
          return updated;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      updateAssetStatus: async (assetId: string, status: AssetStatus) => {
        const id = requireBotUser('UPDATE_ASSETS');
        if (!assetId || !status) throw new PluginInputError("SDK Input Exception: AssetId and Status are required.");

        try {
          const updated = await db.asset.update({
            where: { id: assetId },
            data: { status }
          });

          await db.auditLog.create({
            data: { action: `[PLUGIN:${pluginId}] ASSET_STATUS_UPDATED`, entityType: "Asset", entityId: assetId, userId: id, changes: { status } }
          });
          
          await triggerHook('onAssetUpdated', updated);
          return updated;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      attachEvidenceToIncident: async (incidentId: string, filename: string, fileUrl: string) => {
        const id = requireBotUser('UPLOAD_INCIDENT_ATTACHMENTS');
        if (!incidentId || !filename || !fileUrl) throw new PluginInputError("SDK Input Exception: IncidentId, filename, and fileUrl are required.");

        try {
          const attachment = await db.attachment.create({
            data: { filename, fileUrl, incidentId, uploaderId: id }
          });

          await db.auditLog.create({
            data: { action: `[PLUGIN:${pluginId}] EVIDENCE_ATTACHED`, entityType: "Incident", entityId: incidentId, userId: id, changes: { filename } }
          });
          
          await triggerHook('onEvidenceAttached', attachment);
          return attachment;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      attachEvidenceToVulnerability: async (vulnId: string, filename: string, fileUrl: string) => {
        const id = requireBotUser('UPLOAD_VULN_ATTACHMENTS');
        if (!vulnId || !filename || !fileUrl) throw new PluginInputError("SDK Input Exception: VulnId, filename, and fileUrl are required.");

        try {
          const attachment = await db.attachment.create({
            data: { filename, fileUrl, vulnId, uploaderId: id }
          });

          await db.auditLog.create({
            data: { action: `[PLUGIN:${pluginId}] EVIDENCE_ATTACHED`, entityType: "Vulnerability", entityId: vulnId, userId: id, changes: { filename } }
          });
          
          await triggerHook('onEvidenceAttached', attachment);
          return attachment;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      // ======== Phase 4 Elements ========

      getAssetByIp: async (ipAddress: string) => {
        requireBotUser('VIEW_ASSETS');
        if (!ipAddress || typeof ipAddress !== 'string') throw new PluginInputError("SDK Input Exception: IP address required.");

        try {
          return await db.asset.findFirst({
            where: { ipAddress }
          });
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      getAssetByIdentifier: async (identifier: string) => {
        requireBotUser('VIEW_ASSETS');
        if (!identifier || typeof identifier !== 'string') throw new PluginInputError("SDK Input Exception: Identifier required.");

        try {
          // Checks externalId natively, resolving virtual assets instantly
          return await db.asset.findFirst({
            where: { externalId: identifier }
          });
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      updateVulnerabilityStatus: async (vulnId: string, status: VulnStatus) => {
        const id = requireBotUser('UPDATE_VULNERABILITIES');
        if (!vulnId || !status) throw new PluginInputError("SDK Input Exception: vulnId and status are required.");

        try {
          const updated = await db.vulnerability.update({
            where: { id: vulnId },
            data: { status }
          });

          await db.auditLog.create({
            data: { action: `[PLUGIN:${pluginId}] VULNERABILITY_STATUS_UPDATED`, entityType: "Vulnerability", entityId: vulnId, userId: id, changes: { status } }
          });
          
          await triggerHook('onVulnerabilityUpdated', updated);
          return updated;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      manageIncidentTags: async (incidentId: string, tag: string, action: 'add' | 'remove') => {
        const id = requireBotUser('UPDATE_INCIDENTS_METADATA');
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
            data: { action: `[PLUGIN:${pluginId}] INCIDENT_TAGS_MODIFIED`, entityType: "Incident", entityId: incidentId, userId: id, changes: { tags: newTags } }
          });
          
          await triggerHook('onIncidentUpdated', updated);
          return updated;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      pushNotification: async (targetUserId: string, title: string, body: string, link?: string) => {
        requireBotUser(); // Base communication capability
        if (!targetUserId || !title || !body) throw new PluginInputError("SDK Input Exception: target, title, and body are required.");

        // Input truncations for Notification length safety
        const safeTitle = title.substring(0, 100);
        const safeBody = body.substring(0, 500);

        try {
          return await db.userNotification.create({
            data: { userId: targetUserId, title: safeTitle, body: safeBody, link }
          });
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      searchOpenIncidents: async (query?: { severity?: Severity, tags?: string[], limit?: number }) => {
        requireBotUser('VIEW_INCIDENTS_ALL');
        
        try {
          const limit = Math.min(query?.limit || 50, 100); // Safety bound limit
          const conditions: any = { status: { notIn: ['RESOLVED', 'CLOSED'] } };
          
          if (query?.severity) conditions.severity = query.severity;
          if (query?.tags && query.tags.length > 0) conditions.tags = { hasSome: query.tags };

          return await db.incident.findMany({
            where: conditions,
            take: limit
          });
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      // ======== Phase 6 Elements ========

      deleteIncident: async (id: string) => {
        const userId = requireBotUser('DELETE_INCIDENTS');
        if (!id || typeof id !== 'string') throw new PluginInputError("SDK Input Exception: ID must be a string");
        
        try {
          await db.auditLog.create({
             data: { action: `[PLUGIN:${pluginId}] ENTITY_DELETED`, entityType: "Incident", entityId: id, userId, changes: { status: "PURGED" } }
          });
          const del = await db.incident.delete({ where: { id } });
          await triggerHook('onIncidentDestroyed', id);
          return del;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      deleteAsset: async (id: string) => {
        const userId = requireBotUser('DELETE_ASSETS');
        if (!id || typeof id !== 'string') throw new PluginInputError("SDK Input Exception: ID must be a string");
        
        try {
          await db.auditLog.create({
             data: { action: `[PLUGIN:${pluginId}] ENTITY_DELETED`, entityType: "Asset", entityId: id, userId, changes: { status: "PURGED" } }
          });
          const del = await db.asset.delete({ where: { id } });
          await triggerHook('onAssetDestroyed', id);
          return del;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      deleteVulnerability: async (id: string) => {
        const userId = requireBotUser('DELETE_VULNERABILITIES');
        if (!id || typeof id !== 'string') throw new PluginInputError("SDK Input Exception: ID must be a string");
        
        try {
          await db.auditLog.create({
             data: { action: `[PLUGIN:${pluginId}] ENTITY_DELETED`, entityType: "Vulnerability", entityId: id, userId, changes: { status: "PURGED" } }
          });
          const del = await db.vulnerability.delete({ where: { id } });
          await triggerHook('onVulnerabilityDestroyed', id);
          return del;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      updateAssetMetadata: async (assetId: string, metadataPatch: any) => {
        const userId = requireBotUser('UPDATE_ASSETS');
        if (!assetId || typeof metadataPatch !== 'object') throw new PluginInputError("SDK Input Exception: Asset ID and object patch required");

        try {
          const asset = await db.asset.findUnique({ where: { id: assetId } });
          if (!asset) throw new PluginSystemError("SDK Relation Error: Asset not found.");

          const mergedMetadata = {
             ...(asset.metadata && typeof asset.metadata === 'object' ? asset.metadata : {}),
             ...metadataPatch
          };

          const updated = await db.asset.update({
            where: { id: assetId },
            data: { metadata: mergedMetadata }
          });

          await db.auditLog.create({
             data: { action: `[PLUGIN:${pluginId}] METADATA_PATCHED`, entityType: "Asset", entityId: assetId, userId, changes: metadataPatch }
          });
          
          await triggerHook('onAssetUpdated', updated);
          return updated;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      logPluginMetric: async (metricName: string, value: number, payload?: any) => {
        requireBotUser(); // Base telemetry capability
        if (!metricName) throw new PluginInputError("SDK Input Exception: Metric name required");

        try {
          const now = new Date();
          // Align to 30-min window for MetricSnapshot
          const windowMs = 30 * 60 * 1000;
          const roundedTime = new Date(Math.floor(now.getTime() / windowMs) * windowMs);

          const safePayload = JSON.stringify({ 
             value, 
             ...(typeof payload === 'object' ? payload : {}) 
          });

          // Insert directly as user-scoped metrics tied solely to the plugin identifier
          return await db.metricSnapshot.create({
            data: {
              timestamp: roundedTime,
              scopeType: 'USER', 
              scopeId: `PLUGIN_${pluginId}_${metricName}`,
              payload: safePayload.length > 5000 ? safePayload.substring(0, 5000) : safePayload
            }
          });
        } catch (error) { 
           // Metric overlap or DB fail; catch quietly to prevent crashing the plugin execution flow
           return null;
        }
      },

      // ======== Phase 7 Elements ========

      createUser: async (email: string, name: string, assignRoleNames?: string[]) => {
        const id = requireBotUser('CREATE_USERS');
        if (!email || !name) throw new PluginInputError("SDK Input Exception: Email and name are required");

        // Validate Roles (Prevent giving out SYSTEM level permissions implicitly without ASSIGN_USER_ROLES)
        let rolesToConnect: any = [];
        if (assignRoleNames && assignRoleNames.length > 0) {
           requireBotUser('ASSIGN_USER_ROLES');
           const validRoles = await db.customRole.findMany({ 
              where: { name: { in: assignRoleNames }, isSystem: false } // Force block system role injection via SDK
           });
           rolesToConnect = validRoles.map(r => ({ id: r.id }));
        }

        try {
          const newUser = await db.user.create({
            data: {
              email,
              name,
              isDisabled: false,
              isBot: false,
              customRoles: rolesToConnect.length > 0 ? { connect: rolesToConnect } : undefined
            }
          });
          
          await db.auditLog.create({
             data: { action: `[PLUGIN:${pluginId}] USER_CREATED`, entityType: "User", entityId: newUser.id, userId: id, changes: { email, assignRoleNames } }
          });
          
          await triggerHook('onUserCreated', newUser);
          return newUser;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      suspendUser: async (userId: string) => {
        const id = requireBotUser('SUSPEND_USERS');
        if (!userId) throw new PluginInputError("SDK Input Exception: User ID required.");

        try {
          // You cannot suspend another Bot through the SDK. Too dangerous.
          const target = await db.user.findUnique({ where: { id: userId } });
          if (target?.isBot) throw new PluginPermissionError("SDK Security Exception: Cannot suspend a System bot.");

          const updated = await db.user.update({
            where: { id: userId },
            data: { isDisabled: true }
          });
          
          await db.auditLog.create({
             data: { action: `[PLUGIN:${pluginId}] USER_SUSPENDED`, entityType: "User", entityId: userId, userId: id, changes: { isDisabled: true } }
          });
          
          await triggerHook('onUserUpdated', updated);
          return updated;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      assignUserRoles: async (userId: string, targetRoleNames: string[]) => {
        const id = requireBotUser('ASSIGN_USER_ROLES');
        if (!userId || !Array.isArray(targetRoleNames)) throw new PluginInputError("SDK Input Exception: User ID and Roles Array required.");

        try {
          const target = await db.user.findUnique({ where: { id: userId } });
          if (target?.isBot) throw new PluginPermissionError("SDK Security Exception: Cannot modify roles of a System bot via SDK.");

          const validRoles = await db.customRole.findMany({ 
             where: { name: { in: targetRoleNames }, isSystem: false }
          });

          const updated = await db.user.update({
             where: { id: userId },
             data: { customRoles: { set: validRoles.map(r => ({ id: r.id })) } }
          });

          await db.auditLog.create({
             data: { action: `[PLUGIN:${pluginId}] USER_ROLES_MODIFIED`, entityType: "User", entityId: userId, userId: id, changes: { targetRoleNames } }
          });
          
          await triggerHook('onUserUpdated', updated);
          return updated;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      resetUserMfaSession: async (userId: string) => {
        const id = requireBotUser('UPDATE_USER_PROFILE');
        if (!userId) throw new PluginInputError("SDK Input Exception: User ID required.");

        try {
          const updated = await db.user.update({
            where: { id: userId },
            data: { isTwoFactorEnabled: false, twoFactorSecret: null }
          });
          
          await db.auditLog.create({
             data: { action: `[PLUGIN:${pluginId}] USER_MFA_RESET`, entityType: "User", entityId: userId, userId: id, changes: { mfaDisabled: true } }
          });
          
          await triggerHook('onUserUpdated', updated);
          return updated;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      // ======== Phase 8 Elements ========

      updateIncidentDetails: async (incidentId: string, updates: { title?: string, description?: string, severity?: Severity, assetId?: string | null }) => {
        const id = requireBotUser('UPDATE_INCIDENTS_METADATA');
        if (!incidentId) throw new PluginInputError("SDK Input Exception: IncidentId required.");

        try {
          const updated = await db.incident.update({
            where: { id: incidentId },
            data: updates
          });
          
          await db.auditLog.create({
             data: { action: `[PLUGIN:${pluginId}] INCIDENT_UPDATED`, entityType: "Incident", entityId: incidentId, userId: id, changes: updates }
          });
          
          await triggerHook('onIncidentUpdated', updated);
          return updated;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      getVulnerability: async (vulnId: string) => {
        requireBotUser('VIEW_VULNERABILITIES');
        if (!vulnId) throw new PluginInputError("SDK Input Exception: vulnId required.");
        
        try {
          return await db.vulnerability.findUnique({ where: { id: vulnId }, include: { vulnerabilityAssets: true } });
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      searchVulnerabilities: async (query?: { severity?: Severity, status?: VulnStatus, limit?: number }) => {
        requireBotUser('VIEW_VULNERABILITIES');
        try {
          const limit = Math.min(query?.limit || 50, 100);
          const conditions: any = {};
          if (query?.severity) conditions.severity = query.severity;
          if (query?.status) conditions.status = query.status;

          return await db.vulnerability.findMany({ where: conditions, take: limit, include: { vulnerabilityAssets: true } });
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      updateVulnerabilityDetails: async (vulnId: string, updates: { title?: string, description?: string, severity?: Severity, cveId?: string | null, cvssScore?: number | null }) => {
        const id = requireBotUser('UPDATE_VULNERABILITIES');
        if (!vulnId) throw new PluginInputError("SDK Input Exception: vulnId required.");
        
        try {
          const updated = await db.vulnerability.update({
            where: { id: vulnId },
            data: updates
          });
          
          await db.auditLog.create({
             data: { action: `[PLUGIN:${pluginId}] VULNERABILITY_UPDATED`, entityType: "Vulnerability", entityId: vulnId, userId: id, changes: updates }
          });
          
          await triggerHook('onVulnerabilityUpdated', updated);
          return updated;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      addCommentToVulnerability: async (vulnId: string, content: string) => {
        const id = requireBotUser('ADD_COMMENTS');
        if (!vulnId || !content) throw new PluginInputError("SDK Input Exception: vulnId and content required.");

        try {
          const comment = await db.comment.create({
            data: { content, vulnId, authorId: id }
          });
          await triggerHook('onCommentAdded', comment);
          return comment;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      assignVulnerability: async (vulnId: string, targetUserId: string) => {
        const id = requireBotUser('ASSIGN_VULNERABILITIES_OTHERS');
        if (!vulnId || !targetUserId) throw new PluginInputError("SDK Input Exception: vulnId and targetUserId required.");

        try {
          const targetUser = await db.user.findUnique({ where: { id: targetUserId }});
          if (!targetUser) throw new PluginSystemError(`SDK Relation Error: Target user '${targetUserId}' does not exist.`);

          const updated = await db.vulnerability.update({
            where: { id: vulnId },
            data: { assignees: { connect: { id: targetUserId } } }
          });

          await db.auditLog.create({
            data: { action: `[PLUGIN:${pluginId}] VULN_ASSIGNED`, entityType: "Vulnerability", entityId: vulnId, userId: id, changes: { targetUserId } }
          });
          
          await triggerHook('onVulnerabilityUpdated', updated);
          return updated;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      linkVulnerabilityToAsset: async (vulnId: string, assetId: string) => {
        const id = requireBotUser('LINK_VULN_TO_ASSET');
        if (!vulnId || !assetId) throw new PluginInputError("SDK Input Exception: vulnId and assetId required.");

        try {
          const asset = await db.asset.findUnique({ where: { id: assetId } });
          if (!asset) throw new PluginSystemError(`SDK Relation Error: Asset '${assetId}' does not exist.`);

          const link = await db.vulnerabilityAsset.create({
            data: { vulnId, assetId, status: 'AFFECTED' }
          });

          await db.auditLog.create({
            data: { action: `[PLUGIN:${pluginId}] VULN_ASSET_LINKED`, entityType: "Vulnerability", entityId: vulnId, userId: id, changes: { assetId } }
          });
          
          const expandedVuln = await db.vulnerability.findUnique({ where: { id: vulnId }, include: { vulnerabilityAssets: true } });
          await triggerHook('onVulnerabilityUpdated', expandedVuln);
          return link;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      updateVulnerabilityAssetStatus: async (vulnId: string, assetId: string, status: VulnAssetStatus, notes?: string) => {
        const id = requireBotUser('UPDATE_VULNERABILITIES');
        if (!vulnId || !assetId || !status) throw new PluginInputError("SDK Input Exception: vulnId, assetId, and status required.");

        try {
          const updated = await db.vulnerabilityAsset.update({
            where: { vulnId_assetId: { vulnId, assetId } },
            data: { status, notes }
          });

          await db.auditLog.create({
            data: { action: `[PLUGIN:${pluginId}] VULN_ASSET_STATUS_UPDATED`, entityType: "Vulnerability", entityId: vulnId, userId: id, changes: { assetId, status, notes } }
          });
          
          const expandedVuln = await db.vulnerability.findUnique({ where: { id: vulnId }, include: { vulnerabilityAssets: true } });
          await triggerHook('onVulnerabilityUpdated', expandedVuln);
          return updated;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      getAsset: async (assetId: string) => {
        requireBotUser('VIEW_ASSETS');
        if (!assetId) throw new PluginInputError("SDK Input Exception: Asset ID required.");
        
        try {
          return await db.asset.findUnique({ where: { id: assetId } });
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      searchAssets: async (query?: { type?: AssetType, status?: AssetStatus, limit?: number }) => {
        requireBotUser('VIEW_ASSETS');
        try {
          const limit = Math.min(query?.limit || 50, 100);
          const conditions: any = {};
          if (query?.type) conditions.type = query.type;
          if (query?.status) conditions.status = query.status;

          return await db.asset.findMany({ where: conditions, take: limit });
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      updateAssetDetails: async (assetId: string, updates: { name?: string, type?: AssetType, ipAddress?: string | null, externalId?: string | null }) => {
        const id = requireBotUser('UPDATE_ASSETS');
        if (!assetId) throw new PluginInputError("SDK Input Exception: Asset ID required.");

        try {
          const updated = await db.asset.update({
            where: { id: assetId },
            data: updates
          });
          
          await db.auditLog.create({
             data: { action: `[PLUGIN:${pluginId}] ASSET_UPDATED`, entityType: "Asset", entityId: assetId, userId: id, changes: updates }
          });
          
          await triggerHook('onAssetUpdated', updated);
          return updated;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      // ======== Phase 9 Elements ========

      linkIncidentToAsset: async (incidentId: string, assetId: string) => {
        const id = requireBotUser('LINK_INCIDENT_TO_ASSET');
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
            data: { action: `[PLUGIN:${pluginId}] INCIDENT_LINKED_TO_ASSET`, entityType: "Incident", entityId: incidentId, userId: id, changes: { assetId } }
          });
          
          await triggerHook('onIncidentUpdated', updated);
          return updated;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      unassignIncident: async (incidentId: string, targetUserId: string) => {
        const id = requireBotUser('ASSIGN_INCIDENTS_OTHERS');
        if (!incidentId || !targetUserId) throw new PluginInputError("SDK Input Exception: incidentId and targetUserId required.");

        try {
          const updated = await db.incident.update({
             where: { id: incidentId },
             data: { assignees: { disconnect: { id: targetUserId } } }
          });

          await db.auditLog.create({
            data: { action: `[PLUGIN:${pluginId}] INCIDENT_UNASSIGNED`, entityType: "Incident", entityId: incidentId, userId: id, changes: { targetUserId } }
          });
          
          await triggerHook('onIncidentUpdated', updated);
          return updated;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      unassignVulnerability: async (vulnId: string, targetUserId: string) => {
        const id = requireBotUser('ASSIGN_VULNERABILITIES_OTHERS');
        if (!vulnId || !targetUserId) throw new PluginInputError("SDK Input Exception: vulnId and targetUserId required.");

        try {
          const updated = await db.vulnerability.update({
             where: { id: vulnId },
             data: { assignees: { disconnect: { id: targetUserId } } }
          });

          await db.auditLog.create({
            data: { action: `[PLUGIN:${pluginId}] VULNERABILITY_UNASSIGNED`, entityType: "Vulnerability", entityId: vulnId, userId: id, changes: { targetUserId } }
          });
          
          await triggerHook('onVulnerabilityUpdated', updated);
          return updated;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      unlinkVulnerabilityFromAsset: async (vulnId: string, assetId: string) => {
        const id = requireBotUser('LINK_VULN_TO_ASSET');
        if (!vulnId || !assetId) throw new PluginInputError("SDK Input Exception: vulnId and assetId required.");

        try {
          // Delete the mapping row
          const unlinked = await db.vulnerabilityAsset.delete({
            where: { vulnId_assetId: { vulnId, assetId } }
          });

          await db.auditLog.create({
            data: { action: `[PLUGIN:${pluginId}] VULN_ASSET_UNLINKED`, entityType: "Vulnerability", entityId: vulnId, userId: id, changes: { assetId } }
          });
          
          const expandedVuln = await db.vulnerability.findUnique({ where: { id: vulnId }, include: { vulnerabilityAssets: true } });
          await triggerHook('onVulnerabilityUpdated', expandedVuln);
          return unlinked;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      deleteComment: async (commentId: string) => {
        // Enforce basic deletion minimum. A plugin only deletes what it owns unless it has ANY_COMMENTS.
        const id = requireBotUser('DELETE_OWN_COMMENTS');
        if (!commentId) throw new PluginInputError("SDK Input Exception: Comment ID required.");

        try {
          const comment = await db.comment.findUnique({ where: { id: commentId } });
          if (!comment) return null; // Idempotent

          // Zero-Trust Check: if the plugin didn't author it, verify DELETE_ANY_COMMENTS
          if (comment.authorId !== id) {
             requireBotUser('DELETE_ANY_COMMENTS');
          }

          const deleted = await db.comment.delete({ where: { id: commentId } });
          await db.auditLog.create({
             data: { action: `[PLUGIN:${pluginId}] COMMENT_DELETED`, entityType: "Comment", entityId: commentId, userId: id, changes: { "status": "purged" } }
          });
          return deleted;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      deleteIncidentAttachment: async (attachmentId: string) => {
        const id = requireBotUser('DELETE_INCIDENT_ATTACHMENTS');
        if (!attachmentId) throw new PluginInputError("SDK Input Exception: attachmentId required.");

        try {
          const deleted = await db.attachment.delete({ where: { id: attachmentId } });
          await db.auditLog.create({
             data: { action: `[PLUGIN:${pluginId}] INCIDENT_ATTACHMENT_DELETED`, entityType: "Attachment", entityId: attachmentId, userId: id, changes: { "status": "purged" } }
          });
          return deleted;
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      deleteVulnerabilityAttachment: async (attachmentId: string) => {
         const id = requireBotUser('DELETE_VULN_ATTACHMENTS');
         if (!attachmentId) throw new PluginInputError("SDK Input Exception: attachmentId required.");
 
         try {
           const deleted = await db.attachment.delete({ where: { id: attachmentId } });
           await db.auditLog.create({
              data: { action: `[PLUGIN:${pluginId}] VULN_ATTACHMENT_DELETED`, entityType: "Attachment", entityId: attachmentId, userId: id, changes: { "status": "purged" } }
           });
           return deleted;
         } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      },

      // ======= Base Capability =======

      logAudit: async (action: string, entityType: string, entityId: string, changes: any) => {
        const id = requireBotUser(); 
        if (!action || typeof action !== 'string') throw new PluginInputError("SDK Input Exception: Audit 'action' required.");
        if (!entityType || typeof entityType !== 'string') throw new PluginInputError("SDK Input Exception: Audit 'entityType' required.");
        if (!entityId || typeof entityId !== 'string') throw new PluginInputError("SDK Input Exception: Audit 'entityId' required.");

        const prefixedAction = action.startsWith(`[PLUGIN:${pluginId}]`) ? action : `[PLUGIN:${pluginId}] ${action.trim()}`;
        try {
          return await db.auditLog.create({
            data: { action: prefixedAction, entityType, entityId, userId: id, changes }
          });
        } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
      }
    }
  }
}
