import React from "react";
import { OpenTicketPlugin } from "@/lib/plugins/types";
import { Ghost, Settings, Bug, ShieldAlert, Cpu } from "lucide-react";

export const DemoUIPlugin: OpenTicketPlugin = {
  manifest: {
    id: "demo.ui.tester",
    name: "Demo UI Tester Plugin",
    version: "1.0.0",
    author: "system",
    description: "Validates Context Widgets, System Tabs, and Routing."
  },
  lifecycle: {
    onLoad: async () => {},
    onEnable: async () => {},
    onDisable: async () => {},
  },
  ui: {
    incidentWidgets: [
      ({ incident }) => (
        <div className="glass-card rounded-xl p-4 mt-4 border border-fuchsia-500/30 bg-fuchsia-500/5 shadow-xl">
           <h3 className="text-fuchsia-400 font-bold mb-2 flex items-center"><Ghost className="w-4 h-4 mr-2" /> Demo UI Injected</h3>
           <p className="text-xs text-fuchsia-200/70">Context ID: {incident?.id}</p>
        </div>
      )
    ],
    vulnerabilityWidgets: [
      ({ vulnerability }) => (
        <div className="glass-card rounded-xl p-4 mt-4 border border-amber-500/30 bg-amber-500/5 shadow-xl">
           <h3 className="text-amber-400 font-bold mb-2 flex items-center"><Bug className="w-4 h-4 mr-2" /> Vuln Context Tool</h3>
           <p className="text-xs text-amber-200/70">Vuln Context: {vulnerability?.title}</p>
        </div>
      )
    ],
    assetWidgets: [
      ({ asset }) => (
        <div className="glass-card rounded-xl p-4 mt-4 border border-cyan-500/30 bg-cyan-500/5 shadow-xl">
           <h3 className="text-cyan-400 font-bold mb-2 flex items-center"><Cpu className="w-4 h-4 mr-2" /> Infrastructure Agent View</h3>
           <p className="text-xs text-cyan-200/70">Asset Context: {asset?.name}</p>
        </div>
      )
    ],
    systemConfigTabs: [
      {
        tabId: "demo-config",
        label: "Demo Plugin Config",
        icon: ShieldAlert,
        component: ({ api, config }) => (
          <div className="space-y-4">
             <div className="p-4 rounded-xl border border-white/10 bg-black/40">
                <h3 className="text-primary font-bold">Plugin Settings Interface</h3>
                <p className="text-xs text-muted-foreground mt-2">This tab was injected seamlessly into the System Configuration view.</p>
             </div>
          </div>
        )
      }
    ],
    pages: [
      {
        routeUrl: "dashboard",
        title: "Demo Full Page",
        icon: Settings,
        component: ({ api, session }) => (
          <div className="glass-card rounded-xl p-8 border border-white/10 text-center">
            <Ghost className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse" />
            <h1 className="text-2xl font-bold text-white mb-2">Welcome to your Plugin App</h1>
            <p className="text-muted-foreground">Logged in as {session?.user?.name}</p>
          </div>
        )
      }
    ]
  }
};
