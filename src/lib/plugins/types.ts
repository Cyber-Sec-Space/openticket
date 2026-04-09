import { Incident, Asset, User } from "@prisma/client";
import { ComponentType } from "react";
import { PluginSdkContext } from "./sdk-context";

export type OpenTicketPluginHooks = {
  /** Triggered exactly once when the plugin is activated by an Administrator */
  onInstall?: (config: Record<string, any>, context: PluginSdkContext) => Promise<void>;
  
  /** Triggered exactly once when the plugin is deactivated by an Administrator */
  onUninstall?: (config: Record<string, any>, context: PluginSdkContext) => Promise<void>;

  /** Triggered instantly when a new incident is logged into the system */
  onIncidentCreated?: (incident: Partial<Incident>, config: Record<string, any>, context: PluginSdkContext) => Promise<void>;
  
  /** Triggered when a ticket shifts structurally to RESOLVED or CLOSED */
  onIncidentResolved?: (incident: Partial<Incident>, config: Record<string, any>, context: PluginSdkContext) => Promise<void>;
  
  /** Triggered during Automated Quarantines or manual Admin Asset isolation */
  onAssetCompromise?: (asset: Partial<Asset>, config: Record<string, any>, context: PluginSdkContext) => Promise<void>;

  /** Triggered when a new infrastructure node is registered */
  onAssetCreated?: (asset: Partial<Asset>, config: Record<string, any>, context: PluginSdkContext) => Promise<void>;

  /** Triggered when an infrastructure node's properties or status change */
  onAssetUpdated?: (asset: Partial<Asset>, config: Record<string, any>, context: PluginSdkContext) => Promise<void>;

  /** Triggered when an asset is permanently decommissioned */
  onAssetDestroyed?: (assetId: string, config: Record<string, any>, context: PluginSdkContext) => Promise<void>;

  /** Triggered when a new vulnerability is ingested */
  onVulnerabilityCreated?: (vuln: any, config: Record<string, any>, context: PluginSdkContext) => Promise<void>;

  /** Triggered when a vulnerability's details, status, or asset mappings change */
  onVulnerabilityUpdated?: (vuln: any, config: Record<string, any>, context: PluginSdkContext) => Promise<void>;

  /** Triggered when a vulnerability record is purged */
  onVulnerabilityDestroyed?: (vulnId: string, config: Record<string, any>, context: PluginSdkContext) => Promise<void>;


  /** Triggered when an operator posts a new investigation comment */
  onCommentAdded?: (comment: any, config: Record<string, any>, context: PluginSdkContext) => Promise<void>;

  /** Triggered when a new security operator / user joins the system */
  onUserCreated?: (user: Partial<User>, config: Record<string, any>, context: PluginSdkContext) => Promise<void>;

  /** Triggered when a security operator's details or roles change */
  onUserUpdated?: (user: Partial<User>, config: Record<string, any>, context: PluginSdkContext) => Promise<void>;

  /** Triggered when a security operator is permanently removed */
  onUserDestroyed?: (userId: string, config: Record<string, any>, context: PluginSdkContext) => Promise<void>;


  /** Triggered when physical evidence or files are attached to a case */
  onEvidenceAttached?: (attachment: any, config: Record<string, any>, context: PluginSdkContext) => Promise<void>;

  /** Triggered when physical evidence is removed by a root operator */
  onEvidenceDestroyed?: (attachmentId: string, config: Record<string, any>, context: PluginSdkContext) => Promise<void>;

  /** Triggered when incident details, assignees, or statuses change */
  onIncidentUpdated?: (incident: Partial<Incident>, config: Record<string, any>, context: PluginSdkContext) => Promise<void>;

  /** Triggered when an incident is permanently destroyed */
  onIncidentDestroyed?: (incidentId: string, config: Record<string, any>, context: PluginSdkContext) => Promise<void>;

  /** Triggered when global security policies / system settings are updated */
  onSystemSettingsUpdated?: (settings: any, config: Record<string, any>, context: PluginSdkContext) => Promise<void>;
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
