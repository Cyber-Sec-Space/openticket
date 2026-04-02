import { Incident, Asset, User } from "@prisma/client";
import { ComponentType } from "react";

export type OpenTicketPluginHooks = {
  /** Triggered instantly when a new incident is logged into the system */
  onIncidentCreated?: (incident: Partial<Incident>) => Promise<void>;
  
  /** Triggered when a ticket shifts structurally to RESOLVED or CLOSED */
  onIncidentResolved?: (incident: Partial<Incident>) => Promise<void>;
  
  /** Triggered during Automated Quarantines or manual Admin Asset isolation */
  onAssetCompromise?: (asset: Partial<Asset>) => Promise<void>;
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
  };
  
  hooks?: OpenTicketPluginHooks;
  ui?: OpenTicketPluginUI;
}
