import { Incident, Asset, User } from "@prisma/client";
export type { Incident, Asset, User };
import { ComponentType } from "react";
import { PluginSdkContext } from "./sdk-context";

export const PLUGIN_API_VERSION = "1.0.0";


export type OpenTicketPluginHooks = {
  /** Triggered exactly once when the plugin is activated by an Administrator */
  onInstall?: (config: any, context: PluginSdkContext) => Promise<any>;
  
  /** Triggered exactly once when the plugin is deactivated by an Administrator */
  onUninstall?: (config: any, context: PluginSdkContext) => Promise<any>;

  /** Triggered instantly when a new incident is logged into the system */
  onIncidentCreated?: (incident: any, config: any, context: PluginSdkContext) => Promise<any>;
  
  /** Triggered when a ticket shifts structurally to RESOLVED or CLOSED */
  onIncidentResolved?: (incident: any, config: any, context: PluginSdkContext) => Promise<any>;
  
  /** Triggered during Automated Quarantines or manual Admin Asset isolation */
  onAssetCompromise?: (asset: any, config: any, context: PluginSdkContext) => Promise<any>;

  /** Triggered when a new infrastructure node is registered */
  onAssetCreated?: (asset: any, config: any, context: PluginSdkContext) => Promise<any>;

  /** Triggered when an infrastructure node's properties or status change */
  onAssetUpdated?: (asset: any, config: any, context: PluginSdkContext) => Promise<any>;

  /** Triggered when an asset is permanently decommissioned */
  onAssetDestroyed?: (assetId: string, config: any, context: PluginSdkContext) => Promise<any>;

  /** Triggered when a new vulnerability is ingested */
  onVulnerabilityCreated?: (vuln: any, config: any, context: PluginSdkContext) => Promise<any>;

  /** Triggered when a vulnerability's details, status, or asset mappings change */
  onVulnerabilityUpdated?: (vuln: any, config: any, context: PluginSdkContext) => Promise<any>;

  /** Triggered when a vulnerability record is purged */
  onVulnerabilityDestroyed?: (vulnId: string, config: any, context: PluginSdkContext) => Promise<any>;


  /** Triggered when an operator posts a new investigation comment */
  onCommentAdded?: (comment: any, config: any, context: PluginSdkContext) => Promise<any>;

  /** Triggered when a new security operator / user joins the system */
  onUserCreated?: (user: any, config: any, context: PluginSdkContext) => Promise<any>;

  /** Triggered when a security operator's details or roles change */
  onUserUpdated?: (user: any, config: any, context: PluginSdkContext) => Promise<any>;

  /** Triggered when a security operator is permanently removed */
  onUserDestroyed?: (userId: string, config: any, context: PluginSdkContext) => Promise<any>;


  /** Triggered when physical evidence or files are attached to a case */
  onEvidenceAttached?: (attachment: any, config: any, context: PluginSdkContext) => Promise<any>;

  /** Triggered when physical evidence is removed by a root operator */
  onEvidenceDestroyed?: (attachmentId: string, config: any, context: PluginSdkContext) => Promise<any>;

  /** Triggered when incident details, assignees, or statuses change */
  onIncidentUpdated?: (incident: any, config: any, context: PluginSdkContext) => Promise<any>;

  /** Triggered when an incident is permanently destroyed */
  onIncidentDestroyed?: (incidentId: string, config: any, context: PluginSdkContext) => Promise<any>;

  /** Triggered when global security policies / system settings are updated */
  onSystemSettingsUpdated?: (settings: any, config: any, context: PluginSdkContext) => Promise<any>;

  /** Triggered when an external webhook associated with this plugin is received */
  onWebhookReceived?: (req: Request, config: any, context: PluginSdkContext) => Promise<any>;
};

export type OpenTicketPluginUI = {
  /** Small React Client Components to inject into the Main Dashboard grid */
  dashboardWidgets?: ComponentType<any>[];
  
  /** Complex React panels to inject securely into the Operator Settings Tab */
  settingsPanels?: ComponentType<any>[];
};

export interface OpenTicketPlugin {
  manifest: {
    id: string;
    name: string;
    description: string;
    version: string;
    requestedPermissions?: import("@prisma/client").Permission[];
  };
  
  hooks?: OpenTicketPluginHooks;
  ui?: OpenTicketPluginUI;
}
