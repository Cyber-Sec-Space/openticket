import { Incident, Asset, User, Vulnerability, Comment, Attachment, SystemSetting } from "@prisma/client";
export type { Incident, Asset, User, Vulnerability, Comment, Attachment, SystemSetting };
import { ComponentType } from "react";
import { PluginSdkContext } from "./sdk-context";

export const PLUGIN_API_VERSION = "1.4.0";


export type OpenTicketPluginHooks = {
  /** Triggered exactly once when the plugin is activated by an Administrator */
  onInstall?: (config: Record<string, unknown>, context: PluginSdkContext) => Promise<Record<string, unknown> | void>;
  
  /** Triggered exactly once when the plugin is deactivated by an Administrator */
  onUninstall?: (config: Record<string, unknown>, context: PluginSdkContext) => Promise<Record<string, unknown> | void>;

  /** Triggered instantly when a new incident is logged into the system */
  onIncidentCreated?: (incident: Incident, config: Record<string, unknown>, context: PluginSdkContext) => Promise<Record<string, unknown> | void>;
  
  /** Triggered when a ticket shifts structurally to RESOLVED or CLOSED */
  onIncidentResolved?: (incident: Incident, config: Record<string, unknown>, context: PluginSdkContext) => Promise<Record<string, unknown> | void>;
  
  /** Triggered during Automated Quarantines or manual Admin Asset isolation */
  onAssetCompromise?: (asset: Asset, config: Record<string, unknown>, context: PluginSdkContext) => Promise<Record<string, unknown> | void>;

  /** Triggered when a new infrastructure node is registered */
  onAssetCreated?: (asset: Asset, config: Record<string, unknown>, context: PluginSdkContext) => Promise<Record<string, unknown> | void>;

  /** Triggered when an infrastructure node's properties or status change */
  onAssetUpdated?: (asset: Asset, config: Record<string, unknown>, context: PluginSdkContext) => Promise<Record<string, unknown> | void>;

  /** Triggered when an asset is permanently decommissioned */
  onAssetDestroyed?: (assetId: string, config: Record<string, unknown>, context: PluginSdkContext) => Promise<Record<string, unknown> | void>;

  /** Triggered when a new vulnerability is ingested */
  onVulnerabilityCreated?: (vuln: Vulnerability, config: Record<string, unknown>, context: PluginSdkContext) => Promise<Record<string, unknown> | void>;

  /** Triggered when a vulnerability's details, status, or asset mappings change */
  onVulnerabilityUpdated?: (vuln: Vulnerability, config: Record<string, unknown>, context: PluginSdkContext) => Promise<Record<string, unknown> | void>;

  /** Triggered when a vulnerability record is purged */
  onVulnerabilityDestroyed?: (vulnId: string, config: Record<string, unknown>, context: PluginSdkContext) => Promise<Record<string, unknown> | void>;

  /** Triggered when an operator posts a new investigation comment */
  onCommentAdded?: (comment: Comment, config: Record<string, unknown>, context: PluginSdkContext) => Promise<Record<string, unknown> | void>;

  /** Triggered when a new security operator / user joins the system */
  onUserCreated?: (user: User, config: Record<string, unknown>, context: PluginSdkContext) => Promise<Record<string, unknown> | void>;

  /** Triggered when a security operator's details or roles change */
  onUserUpdated?: (user: User, config: Record<string, unknown>, context: PluginSdkContext) => Promise<Record<string, unknown> | void>;

  /** Triggered when a security operator is permanently removed */
  onUserDestroyed?: (userId: string, config: Record<string, unknown>, context: PluginSdkContext) => Promise<Record<string, unknown> | void>;

  /** Triggered when physical evidence or files are attached to a case */
  onEvidenceAttached?: (attachment: Attachment, config: Record<string, unknown>, context: PluginSdkContext) => Promise<Record<string, unknown> | void>;

  /** Triggered when physical evidence is removed by a root operator */
  onEvidenceDestroyed?: (attachmentId: string, config: Record<string, unknown>, context: PluginSdkContext) => Promise<Record<string, unknown> | void>;

  /** Triggered when incident details, assignees, or statuses change */
  onIncidentUpdated?: (incident: Incident, config: Record<string, unknown>, context: PluginSdkContext) => Promise<Record<string, unknown> | void>;

  /** Triggered when an incident is permanently destroyed */
  onIncidentDestroyed?: (incidentId: string, config: Record<string, unknown>, context: PluginSdkContext) => Promise<Record<string, unknown> | void>;

  /** Triggered when global security policies / system settings are updated */
  onSystemSettingsUpdated?: (settings: SystemSetting, config: Record<string, unknown>, context: PluginSdkContext) => Promise<Record<string, unknown> | void>;

  /** Triggered when an external webhook associated with this plugin is received */
  onWebhookReceived?: (req: Request, config: Record<string, unknown>, context: PluginSdkContext) => Promise<Record<string, unknown> | void>;
};

export type OpenTicketPluginUI = {
  /** Small React Client Components to inject into the Main Dashboard grid */
  dashboardWidgets?: ComponentType<Record<string, unknown>>[];
  
  /** Complex React panels to inject securely into the Operator Settings Tab */
  settingsPanels?: ComponentType<Record<string, unknown>>[];

  // --- NEW: CONTEXT WIDGETS ---

  /** Widgets rendered as cards in the main left-hand column of the Incident Detail view */
  incidentMainWidgets?: ComponentType<{ incident: Incident } | Record<string, unknown>>[];
  /** Widgets rendered as cards in the sidebar right-hand column of the Incident Detail view */
  incidentSidebarWidgets?: ComponentType<{ incident: Incident } | Record<string, unknown>>[];

  /** Widgets rendered as cards in the main left-hand column of the Asset Detail view */
  assetMainWidgets?: ComponentType<{ asset: Asset } | Record<string, unknown>>[];
  /** Widgets rendered as cards in the sidebar right-hand column of the Asset Detail view */
  assetSidebarWidgets?: ComponentType<{ asset: Asset } | Record<string, unknown>>[];

  /** Widgets rendered in the main left-hand column Vulnerability Detail view */
  vulnerabilityMainWidgets?: ComponentType<{ vulnerability: Vulnerability } | Record<string, unknown>>[];
  /** Widgets rendered in the sidebar right-hand column Vulnerability Detail view */
  vulnerabilitySidebarWidgets?: ComponentType<{ vulnerability: Vulnerability } | Record<string, unknown>>[];

  /** Widgets rendered in the main left-hand column of the User Profile view */
  userMainWidgets?: ComponentType<{ user: User } | Record<string, unknown>>[];
  /** Widgets rendered in the sidebar right-hand column of the User Profile view */
  userSidebarWidgets?: ComponentType<{ user: User } | Record<string, unknown>>[];

  // --- NEW: FULL PAGE & NAVIGATION ---

  /** 
   * Inject new full-page routes into the platform. 
   * These pages will be automatically registered in the Sidebar under the "Plugins" group or interspersed based on config.
   * They will be mapped automatically to `/plugins/[pluginId]/[routeUrl]`
   */
  pages?: {
    routeUrl: string;                // e.g., 'metrics' => /plugins/my-plugin/metrics
    title: string;                   // Text displayed in sidebar
    icon?: ComponentType<Record<string, unknown>>;       // Lucide / custom icon component for the sidebar
    component: ComponentType<Record<string, unknown>>;   // The full page component to render
  }[];

  // --- NEW: SYSTEM CONFIG EXTENSION ---

  /** New horizontal Tabs injected natively into the Global "System Configuration" (/system) dashboard */
  systemConfigTabs?: {
    tabId: string;                   // Unique ID for the tab URL hash
    label: string;                   // Text displayed on the Tab button
    icon?: ComponentType<Record<string, unknown>>;       // Lucide / custom icon for the Tab button
    component: ComponentType<Record<string, unknown>>;   // The Setting Panel to render inside the tab
  }[];
};

export interface OpenTicketPlugin {
  manifest: {
    id: string;
    name: string;
    description: string;
    version: string;
    author?: string;
    developer?: {
      name?: string;
      email?: string;
      website?: string;
    };
    repositoryUrl?: string;
    icon?: string;
    requestedPermissions?: import("@prisma/client").Permission[];
    supportedPluginApiVersion?: string[];
    options?: Array<{
      key: string;
      type: 'string' | 'number' | 'boolean' | 'enum' | 'secret' | 'info';
      label?: string;
      required?: boolean;
      options?: string[];
      defaultValue?: unknown;
      content?: string;
    }>;
    dependsOn?: string[];
    signature?: string;
    integritySha256?: string;
  };
  
  hooks?: OpenTicketPluginHooks;
  ui?: OpenTicketPluginUI;
}
