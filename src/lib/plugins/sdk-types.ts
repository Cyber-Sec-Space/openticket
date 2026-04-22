import { Permission, IncidentStatus, AssetType, Severity, AssetStatus, VulnStatus, VulnAssetStatus } from "@prisma/client"

export type IncidentData = {
  title: string
  description: string
  type?: any
  severity?: any
  assetIds?: string[]
  tags?: string[]
}

export interface SdkExecutionContext {
  pluginId: string
  requireBotUser: (requiredPermission?: Permission) => string
  triggerHook: (event: string, payload: any) => Promise<void>
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
    updateIncidentDetails: (incidentId: string, updates: { title?: string, description?: string, severity?: Severity, assetIds?: string[] }) => Promise<any>
    
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
