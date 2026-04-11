import React from "react";
import { OpenTicketPlugin } from "@/lib/plugins/types";
import { Ghost, Settings, Bug, ShieldAlert, Cpu, User, LayoutDashboard, Sliders } from "lucide-react";

export const DemoUIPlugin: OpenTicketPlugin = {
  manifest: {
    id: "demo.ui.tester",
    name: "Demo UI Tester Plugin",
    version: "1.0.0",
    author: "system",
    description: "Validates Context Widgets, System Tabs, and Routing."
  },
  hooks: {
    onInstall: async () => {},
    onUninstall: async () => {},
  },
  ui: {
    dashboardWidgets: [
      ({ api, config }) => (
        <div className="glass-card rounded-xl p-6 border border-emerald-500/30 bg-emerald-500/5 shadow-xl col-span-1 md:col-span-2 lg:col-span-1">
          <h3 className="text-emerald-400 font-bold mb-2 flex items-center"><LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard Ingestion</h3>
          <p className="text-xs text-emerald-200/70 mb-4">This widget is directly injected onto the unified operator dashboard grid.</p>
          <div className="flex items-center gap-2 text-[10px] text-emerald-400/50 font-mono tracking-wider">
            <span>DEMO_MODE: {config.ENABLE_DEMO_MODE ? 'ACTIVE' : 'INACTIVE'}</span>
          </div>
        </div>
      )
    ],
    settingsPanels: [
      ({ api, config }) => (
        <div className="flex items-center justify-between p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-indigo-200">Demo User Setting Panel</p>
              <p className="text-xs text-indigo-200/50">Personal settings injected by UI Demo.</p>
            </div>
          </div>
        </div>
      )
    ],
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
    userWidgets: [
      ({ user }) => (
        <div className="glass-card rounded-xl p-4 mt-4 border border-rose-500/30 bg-rose-500/5 shadow-xl">
           <h3 className="text-rose-400 font-bold mb-2 flex items-center"><User className="w-4 h-4 mr-2" /> Operator Insight</h3>
           <p className="text-xs text-rose-200/70">Profile Context: {user?.email}</p>
           {user?.isBot && <p className="text-xs text-rose-400 mt-1 font-mono">Entity is an API Bot</p>}
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
             <div className="p-6 rounded-xl border border-white/10 bg-black/40 shadow-inner">
                <h3 className="text-primary font-bold text-lg flex items-center gap-2"><Settings className="w-5 h-5 text-muted-foreground" /> Plugin Settings Interface</h3>
                <p className="text-sm text-muted-foreground mt-2">This tab was injected seamlessly into the System Configuration view by DemoUIPlugin.</p>
                <div className="mt-6 p-4 rounded bg-primary/5 border border-primary/20 code-block text-xs font-mono">
                  {JSON.stringify(config, null, 2)}
                </div>
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
          <div className="glass-card rounded-xl p-8 border border-white/10 text-center flex flex-col items-center justify-center min-h-[400px]">
            <Ghost className="w-20 h-20 mx-auto mb-6 text-primary animate-pulse" />
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Welcome to your Plugin App</h1>
            <p className="text-muted-foreground">This page is fully sandboxed and loaded via Plugin architecture.</p>
            <p className="text-xs text-primary/60 font-mono mt-4">Logged in as {session?.user?.name || session?.user?.email}</p>
          </div>
        )
      }
    ]
  }
};
