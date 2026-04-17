import { Incident, Asset, User } from "@prisma/client";
export type { Incident, Asset, User };
import { ComponentType } from "react";
import { PluginSdkContext } from "./sdk-context";

export const PLUGIN_API_VERSION = "1.3.0";


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

  // --- NEW: CONTEXT WIDGETS ---

  /** Widgets rendered as cards in the main left-hand column of the Incident Detail view */
  incidentMainWidgets?: ComponentType<{ incident: any } | Record<string, any>>[];
  /** Widgets rendered as cards in the sidebar right-hand column of the Incident Detail view */
  incidentSidebarWidgets?: ComponentType<{ incident: any } | Record<string, any>>[];

  /** Widgets rendered as cards in the main left-hand column of the Asset Detail view */
  assetMainWidgets?: ComponentType<{ asset: any } | Record<string, any>>[];
  /** Widgets rendered as cards in the sidebar right-hand column of the Asset Detail view */
  assetSidebarWidgets?: ComponentType<{ asset: any } | Record<string, any>>[];

  /** Widgets rendered in the main left-hand column Vulnerability Detail view */
  vulnerabilityMainWidgets?: ComponentType<{ vulnerability: any } | Record<string, any>>[];
  /** Widgets rendered in the sidebar right-hand column Vulnerability Detail view */
  vulnerabilitySidebarWidgets?: ComponentType<{ vulnerability: any } | Record<string, any>>[];

  /** Widgets rendered in the main left-hand column of the User Profile view */
  userMainWidgets?: ComponentType<{ user: any } | Record<string, any>>[];
  /** Widgets rendered in the sidebar right-hand column of the User Profile view */
  userSidebarWidgets?: ComponentType<{ user: any } | Record<string, any>>[];

  // --- NEW: FULL PAGE & NAVIGATION ---

  /** 
   * Inject new full-page routes into the platform. 
   * These pages will be automatically registered in the Sidebar under the "Plugins" group or interspersed based on config.
   * They will be mapped automatically to `/plugins/[pluginId]/[routeUrl]`
   */
  pages?: {
    routeUrl: string;                // e.g., 'metrics' => /plugins/my-plugin/metrics
    title: string;                   // Text displayed in sidebar
    icon?: ComponentType<any>;       // Lucide / custom icon component for the sidebar
    component: ComponentType<any>;   // The full page component to render
  }[];

  // --- NEW: SYSTEM CONFIG EXTENSION ---

  /** New horizontal Tabs injected natively into the Global "System Configuration" (/system) dashboard */
  systemConfigTabs?: {
    tabId: string;                   // Unique ID for the tab URL hash
    label: string;                   // Text displayed on the Tab button
    icon?: ComponentType<any>;       // Lucide / custom icon for the Tab button
    component: ComponentType<any>;   // The Setting Panel to render inside the tab
  }[];
};

export interface OpenTicketPlugin {
  manifest: {
    id: string;
    name: string;
    description: string;
    version: string;
    author?: string;
    requestedPermissions?: import("@prisma/client").Permission[];
    supportedPluginApiVersion?: string[];
    options?: Array<{
      key: string;
      type: 'string' | 'number' | 'boolean' | 'enum' | 'secret' | 'info';
      label?: string;
      required?: boolean;
      options?: string[];
      defaultValue?: any;
      content?: string;
    }>;
    dependsOn?: string[];
    signature?: string;
  };
  
  hooks?: OpenTicketPluginHooks;
  ui?: OpenTicketPluginUI;
}
