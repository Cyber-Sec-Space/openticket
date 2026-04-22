import React from "react"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { hasPermission } from "@/lib/auth-utils"
import { Sliders, ShieldCheck, UserPlus, Fingerprint, ShieldAlert, Mail, Activity, ArrowRight, Scale, ToyBrick } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateSystemSettings } from "./actions"
import { SlaSettingsPanel, VULN_TEMPLATES } from "./sla-settings-panel"
import { SmtpTestButton } from "./smtp-test-button"
import { SystemTabsLayout } from "./system-tabs-layout"
import { PLUGIN_API_VERSION } from "@/lib/plugins/types"
import packageJson from "../../../../package.json"
import { Badge } from "@/components/ui/badge"

import { activePlugins } from "@/plugins"
import { parsePluginConfig } from "@/lib/plugins/crypto"
import { createPluginContext } from "@/lib/plugins/sdk-context"

export default async function SystemSettingsPage() {
  const session = await auth()
  if (!session?.user || !hasPermission(session, 'VIEW_SYSTEM_SETTINGS')) {
    redirect("/login")
  }

  const customRoles = await db.customRole.findMany()

  const settings = await db.systemSetting.upsert({
    where: { id: "global" },
    include: { defaultUserRoles: true },
    update: {},
    create: {
      id: "global",
      allowRegistration: true,
      requireGlobal2FA: false,
      slaCriticalHours: 4,
      slaHighHours: 24,
      slaMediumHours: 72,
      slaLowHours: 168,
      slaInfoHours: 720,
      vulnSlaCriticalHours: 12,
      vulnSlaHighHours: 48,
      vulnSlaMediumHours: 168,
      vulnSlaLowHours: 336,
      vulnSlaInfoHours: 720
    }
  })

  const activePluginStates = await db.pluginState.findMany({ where: { isActive: true } });
  const dynamicTabs: any[] = [];
  const dynamicChildren: Record<string, React.ReactNode> = {};

  for (const plugin of activePlugins) {
    const state = activePluginStates.find(s => s.id === plugin.manifest.id);
    if (!state || !plugin.ui?.systemConfigTabs) continue;
    
    const config = state.configJson ? parsePluginConfig(state.configJson) : {};
    const context = await createPluginContext(plugin.manifest.id, plugin.manifest.name);

    plugin.ui.systemConfigTabs.forEach((tab) => {
       const tabKey = `plugin_${plugin.manifest.id}_${tab.tabId}`;
       dynamicTabs.push({
         id: tabKey,
         label: tab.label,
         icon: tab.icon ? <tab.icon className="w-4 h-4" /> : <ToyBrick className="w-4 h-4" />
       });
       
       const Component = tab.component;
       dynamicChildren[tabKey] = (
          <div className="pt-4 animate-in fade-in slide-in-from-bottom-2">
            <React.Suspense fallback={<div className="h-32 bg-black/20 animate-pulse rounded-xl border border-white/5" />}>
              <Component api={context.api} config={config} />
            </React.Suspense>
          </div>
       );
    });
  }

  return (
    <div className="w-full p-6 md:p-10 max-w-[1200px] mx-auto space-y-8 animate-fade-in-up">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <Sliders className="w-8 h-8 mr-3 text-emerald-400" /> System Configuration
          </h1>
          <p className="text-muted-foreground mt-2 text-lg mb-3">Manage global operational protocols and perimeter boundaries.</p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px] text-emerald-300 border-emerald-500/30 bg-black/40 px-2 py-0">CORE: v{packageJson.version}</Badge>
            <Badge variant="outline" className="font-mono text-[10px] text-blue-300 border-blue-500/30 bg-black/40 px-2 py-0">HOOK ENGINE: v{PLUGIN_API_VERSION}</Badge>
          </div>
        </div>
      </header>

      <div className="w-full glass-card rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black/40 backdrop-blur-xl">
        <div className="p-6 md:p-8">
          <form action={updateSystemSettings} className="space-y-8 flex flex-col">
            <SystemTabsLayout 
              tabs={[
                { id: "general", label: "General & Access", icon: <ShieldCheck className="w-4 h-4" /> },
                { id: "security", label: "Security & SOAR", icon: <ShieldAlert className="w-4 h-4" /> },
                { id: "sla", label: "SLA Policies", icon: <Activity className="w-4 h-4" /> },
                { id: "smtp", label: "Mail Relay", icon: <Mail className="w-4 h-4" /> },
                { id: "legal", label: "Legal & Licenses", icon: <Scale className="w-4 h-4" /> },
                ...dynamicTabs
              ]}
              children={{
                ...dynamicChildren,
                "general": (
                  <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Registration Toggle */}
                      <div className="flex flex-row items-center space-x-4 rounded-xl border border-white/10 p-5 shadow-sm bg-black/40 hover:bg-black/60 transition-colors">
                        <Checkbox key={String(settings.allowRegistration)} id="allowRegistration" name="allowRegistration" value="on" defaultChecked={settings.allowRegistration} />
                        <div className="space-y-1.5 leading-none">
                          <Label htmlFor="allowRegistration" className="text-sm font-semibold tracking-wide flex items-center cursor-pointer hover:text-emerald-300 transition-colors">
                            <UserPlus className="w-4 h-4 mr-2" /> Allow Public Registration
                          </Label>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Permit unauthenticated actors to generate new access credentials on the platform endpoint.
                          </p>
                        </div>
                      </div>

                      {/* 2FA Toggle */}
                      <div className="flex flex-row items-center space-x-4 rounded-xl border border-white/10 p-5 shadow-sm bg-black/40 hover:bg-black/60 transition-colors">
                        <Checkbox key={String(settings.requireGlobal2FA)} id="requireGlobal2FA" name="requireGlobal2FA" value="on" defaultChecked={settings.requireGlobal2FA} />
                        <div className="space-y-1.5 leading-none">
                          <Label htmlFor="requireGlobal2FA" className="text-sm font-semibold tracking-wide flex items-center cursor-pointer text-primary hover:text-emerald-300 transition-colors">
                            <Fingerprint className="w-4 h-4 mr-2" /> Global Two-Factor Auth
                          </Label>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Mandate TOTP verification universally. <span className="text-destructive font-bold">(Warning: Operator accounts without interlocks will be structurally locked out).</span>
                          </p>
                        </div>
                      </div>

                      {/* Identity Verification Toggle */}
                      <div className="flex flex-row items-center space-x-4 rounded-xl border border-white/10 p-5 shadow-sm bg-black/40 hover:bg-black/60 transition-colors">
                        <Checkbox key={`verify-${settings.requireEmailVerification}`} id="requireEmailVerification" name="requireEmailVerification" value="on" defaultChecked={settings.requireEmailVerification} />
                        <div className="space-y-1.5 leading-none">
                          <Label htmlFor="requireEmailVerification" className="text-sm font-semibold tracking-wide flex items-center cursor-pointer text-emerald-400 hover:text-emerald-300 transition-colors">
                            <ShieldCheck className="w-4 h-4 mr-2" /> Require Email Verification
                          </Label>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Strictly block dashboard access for newly registered users until their email is cryptographically verified to belong to them. (Action aborts if SMTP is offline).
                          </p>
                        </div>
                      </div>

                      {/* Password Reset Toggle */}
                      <div className={`flex flex-row items-center space-x-4 rounded-xl border border-white/10 p-5 shadow-sm transition-colors ${settings.smtpEnabled ? "bg-black/40 hover:bg-black/60" : "bg-black/20 opacity-60"}`}>
                        <Checkbox 
                          key={`reset-${settings.allowPasswordReset}-${settings.smtpEnabled}`} 
                          id="allowPasswordReset" 
                          name="allowPasswordReset" 
                          value="on" 
                          defaultChecked={settings.allowPasswordReset && settings.smtpEnabled} 
                          disabled={!settings.smtpEnabled}
                        />
                        <div className="space-y-1.5 leading-none">
                          <Label htmlFor="allowPasswordReset" className={`text-sm font-semibold tracking-wide flex items-center ${settings.smtpEnabled ? "cursor-pointer text-emerald-400 hover:text-emerald-300" : "cursor-not-allowed text-muted-foreground"} transition-colors`}>
                            <ShieldCheck className="w-4 h-4 mr-2" /> Allow Password Resets
                          </Label>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Permit users to initiate password recovery workflows via email. 
                            {!settings.smtpEnabled && <span className="text-amber-500 font-bold ml-1">(SMTP Relay must be configured and enabled first).</span>}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      {/* System Platform URL */}
                      <div className="space-y-3 p-5 border border-white/10 rounded-xl bg-black/40 hover:bg-black/60 transition-colors">
                        <Label htmlFor="systemPlatformUrl" className="text-sm font-semibold tracking-wide text-primary/80">System Resolving URL</Label>
                        <p className="text-xs text-muted-foreground pb-2">
                           The fully qualified address (e.g. `https://soc.company.com`) utilized during auth emails bridging and redirection loops.
                        </p>
                        <Input 
                           id="systemPlatformUrl" 
                           name="systemPlatformUrl" 
                           defaultValue={settings.systemPlatformUrl} 
                           className="bg-black/60 border-white/10 text-white font-mono focus-visible:ring-primary"
                        />
                      </div>

                      {/* Default Role Select */}
                      <div className="space-y-3 p-5 border border-white/10 rounded-xl bg-black/40 hover:bg-black/60 transition-colors">
                        <Label className="text-sm font-semibold tracking-wide text-primary/80">Default Initialization Privilege</Label>
                        <p className="text-xs text-muted-foreground pb-2">
                           Select the initial access tier granted to newly registered operators.
                        </p>
                        <Select key={settings.defaultUserRoles?.[0]?.name || ""} name="defaultRoleId" defaultValue={settings.defaultUserRoles?.[0]?.name || ""}>
                          <SelectTrigger className="w-full bg-black/60 border-white/10 focus:ring-primary">
                            <SelectValue placeholder="Select Tier" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE" disabled>Select a default role</SelectItem>
                            {customRoles.map(role => (
                               <SelectItem key={role.id} value={role.name}>{role.name} {role.isSystem ? '(System)' : ''}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ),
                "security": (
                  <div className="space-y-8 pt-4 animate-in fade-in slide-in-from-bottom-2">
                    {/* Rate Limiting Section */}
                    <div className="p-6 border border-white/10 rounded-xl bg-black/40 hover:bg-black/60 transition-colors relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                         <ShieldAlert className="w-32 h-32" />
                      </div>
                      <h3 className="text-lg font-bold tracking-wide text-white flex items-center mb-6">
                        Brute-Force Protection Rate Limiting
                      </h3>
                      
                      <div className="flex flex-row items-center space-x-4 mb-6 z-10 relative">
                        <Checkbox key={String(settings.rateLimitEnabled)} id="rateLimitEnabled" name="rateLimitEnabled" value="on" defaultChecked={settings.rateLimitEnabled} className="scale-125" />
                        <div className="space-y-1.5 leading-none">
                          <Label htmlFor="rateLimitEnabled" className="text-base font-semibold cursor-pointer text-emerald-400">
                            Enable Authentication Rate Limiting
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Enforce strict lockout windows to prevent automated credential stuffing and TOTP brute-forcing.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 z-10 relative bg-black/30 p-5 rounded-lg border border-white/5">
                        <div className="space-y-3">
                          <Label htmlFor="rateLimitMaxAttempts" className="text-sm font-medium text-white/80">Max Allowed Failures</Label>
                          <Input 
                            id="rateLimitMaxAttempts" 
                            name="rateLimitMaxAttempts" 
                            type="number" 
                            defaultValue={settings.rateLimitMaxAttempts || 5} 
                            className="bg-black/60 border-white/10 font-mono text-base focus-visible:ring-emerald-500"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label htmlFor="rateLimitWindowMs" className="text-sm font-medium text-white/80">Lockout Window (Milliseconds)</Label>
                          <Input 
                            id="rateLimitWindowMs" 
                            name="rateLimitWindowMs" 
                            type="number" 
                            defaultValue={settings.rateLimitWindowMs || 900000} 
                            className="bg-black/60 border-white/10 font-mono text-base focus-visible:ring-emerald-500"
                          />
                          <p className="text-xs text-muted-foreground italic tracking-wide">e.g., 900000ms = 15 minutes</p>
                        </div>
                      </div>
                    </div>

                    {/* SOAR Automation Section */}
                    <div className="p-6 border border-rose-500/20 rounded-xl bg-gradient-to-br from-black/40 to-rose-950/10 hover:border-rose-500/40 transition-colors relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                         <Activity className="w-32 h-32 text-rose-500" />
                      </div>
                      <h3 className="text-lg font-bold tracking-wide text-rose-400 flex items-center mb-6">
                        SOAR Autonomous Responses
                      </h3>
                      
                      <div className="flex flex-row items-start space-x-4 mb-6 z-10 relative">
                        <Checkbox key={String(settings.soarAutoQuarantineEnabled)} id="soarAutoQuarantineEnabled" name="soarAutoQuarantineEnabled" value="on" defaultChecked={settings.soarAutoQuarantineEnabled} className="mt-1 scale-125 border-rose-500/50 data-[state=checked]:bg-rose-500 data-[state=checked]:text-white" />
                        <div className="space-y-2 leading-tight">
                          <Label htmlFor="soarAutoQuarantineEnabled" className="text-base font-semibold cursor-pointer text-white">
                            Enable Centralized Asset Auto-Quarantine (COMPROMISE mutation)
                          </Label>
                          <p className="text-sm text-foreground/70 leading-relaxed max-w-3xl">
                            Allow operational incidents that exceed target severity to autonomously mutate attached asset states to <strong>COMPROMISED</strong>, unconditionally bypassing basic `UPDATE_ASSETS` boundary restrictions.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 z-10 relative bg-black/30 p-5 rounded-lg border border-white/5 max-w-xl">
                        <Label className="text-sm font-medium text-rose-300/80">SOAR Trigger Severity Threshold</Label>
                        <Select key={`soar-thresh-${settings.soarAutoQuarantineThreshold}`} name="soarAutoQuarantineThreshold" defaultValue={settings.soarAutoQuarantineThreshold || 'CRITICAL'}>
                          <SelectTrigger className="w-full bg-black/60 border-white/10 focus:ring-rose-500 text-base">
                            <SelectValue placeholder="Select Trigger Level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INFO" className="text-blue-400 font-bold">INFO</SelectItem>
                            <SelectItem value="LOW">LOW</SelectItem>
                            <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                            <SelectItem value="HIGH">HIGH</SelectItem>
                            <SelectItem value="CRITICAL" className="text-rose-400 font-bold">CRITICAL</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground pt-1">Any incidents minted equal to or above this severity will engage Auto-Quarantine instantly.</p>
                      </div>
                    </div>
                  </div>
                ),
                "sla": (
                  <div className="pt-4 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="p-6 border border-white/10 rounded-xl bg-black/40 shadow-inner">
                      <SlaSettingsPanel 
                        title="Incident SLA Framework"
                        description="Configure countdown timers assigned to Incidents (Operational Threats)."
                        namePrefix="sla"
                        defaultSla={{ 
                          critical: settings.slaCriticalHours, 
                          high: settings.slaHighHours, 
                          medium: settings.slaMediumHours, 
                          low: settings.slaLowHours,
                          info: settings.slaInfoHours
                        }} 
                      />
                    </div>
                    <div className="p-6 border border-white/10 rounded-xl bg-black/40 shadow-inner">
                      <SlaSettingsPanel 
                        title="Vulnerability SLA Framework"
                        description="Configure countdown timers assigned to Vulnerabilities (Infrastructural Flaws)."
                        namePrefix="vulnSla"
                        templates={VULN_TEMPLATES}
                        defaultSla={{ 
                          critical: settings.vulnSlaCriticalHours, 
                          high: settings.vulnSlaHighHours, 
                          medium: settings.vulnSlaMediumHours, 
                          low: settings.vulnSlaLowHours,
                          info: settings.vulnSlaInfoHours
                        }} 
                      />
                    </div>
                  </div>
                ),
                "smtp": (
                  <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="p-6 border border-white/10 rounded-xl bg-black/40 hover:bg-black/60 transition-colors">
                      <div className="flex flex-row items-center space-x-4 mb-8 pb-6 border-b border-white/10">
                        <Checkbox key={`smtp-${settings.smtpEnabled}`} id="smtpEnabled" name="smtpEnabled" value="on" defaultChecked={settings.smtpEnabled} className="scale-125" />
                        <div className="space-y-1.5 leading-none">
                          <Label htmlFor="smtpEnabled" className="text-base font-semibold cursor-pointer text-white">
                            Enable Email Dispatches
                          </Label>
                          <p className="text-sm text-muted-foreground max-w-2xl">
                            If enabled, critical alerts and assignment notifications will be sent off-platform via this SMTP relay. Verify your network allows outbound connections on the specified port.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
                        {/* SMTP Connection Settings */}
                        <div className="w-full lg:w-[calc(50%-1rem)] flex-shrink-0 space-y-5 bg-black/30 p-6 rounded-lg border border-white/5 relative overflow-hidden">
                          <h4 className="text-sm font-bold tracking-widest uppercase text-primary/70 mb-4 truncate">Connection Credentials</h4>
                          
                          <div className="flex flex-col gap-3">
                            <Label htmlFor="smtpHost" className="text-sm text-foreground/80">SMTP Host</Label>
                            <div className="relative w-full">
                              <Input key={`host-${settings.smtpHost}`} id="smtpHost" name="smtpHost" defaultValue={settings.smtpHost || ""} placeholder="smtp.example.com" className="bg-black/60 border-white/10 font-mono focus-visible:ring-primary w-full text-ellipsis" />
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-3">
                            <Label htmlFor="smtpPort" className="text-sm text-foreground/80">Port</Label>
                            <div className="relative w-full">
                              <Input key={`port-${settings.smtpPort}`} id="smtpPort" name="smtpPort" type="number" defaultValue={settings.smtpPort || 587} placeholder="587" className="bg-black/60 border-white/10 font-mono focus-visible:ring-primary w-full" />
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-3">
                            <Label htmlFor="smtpUser" className="text-sm text-foreground/80">User / Identity</Label>
                            <div className="relative w-full">
                              <Input key={`user-${settings.smtpUser}`} id="smtpUser" name="smtpUser" defaultValue={settings.smtpUser || ""} placeholder="alerts@example.com" className="bg-black/60 border-white/10 font-mono focus-visible:ring-primary w-full text-ellipsis" />
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-3">
                            <Label htmlFor="smtpPassword" className="text-sm text-foreground/80">Password (Leave blank to keep current)</Label>
                            <div className="relative w-full">
                              <Input key={`pass-${settings.smtpPassword}`} id="smtpPassword" name="smtpPassword" type="password" placeholder="••••••••" className="bg-black/60 border-white/10 font-mono focus-visible:ring-primary w-full" />
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-3 pt-2">
                            <Label htmlFor="smtpFrom" className="text-sm text-foreground/80">From Address Display Name</Label>
                            <div className="relative w-full">
                              <Input key={`from-${settings.smtpFrom}`} id="smtpFrom" name="smtpFrom" defaultValue={settings.smtpFrom || ""} placeholder='"OpenTicket SOC" <noreply@openticket.local>' className="bg-black/60 border-white/10 font-mono focus-visible:ring-primary w-full text-ellipsis" />
                            </div>
                          </div>
                          
                          <div className="pt-4 mt-4 border-t border-white/10">
                            <SmtpTestButton />
                          </div>
                        </div>

                        {/* Automated Triggers */}
                        <div className="w-full lg:w-[calc(50%-1rem)] flex-shrink-0 space-y-5 bg-black/30 p-6 rounded-lg border border-white/5 relative overflow-hidden">
                          <h4 className="text-sm font-bold tracking-widest uppercase text-emerald-400/70 mb-4 truncate">Automated Trigger Mapping</h4>
                          
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center space-x-3 p-3 rounded bg-black/20 hover:bg-black/40 border border-transparent hover:border-white/5 transition-colors min-w-0">
                              <Checkbox key={`crit-${settings.smtpTriggerOnCritical}`} id="smtpTriggerOnCritical" name="smtpTriggerOnCritical" value="on" defaultChecked={settings.smtpTriggerOnCritical} className="flex-shrink-0" />
                              <Label htmlFor="smtpTriggerOnCritical" className="text-sm cursor-pointer select-none truncate">Dispatch on CRITICAL Escalations</Label>
                            </div>
                            <div className="flex items-center space-x-3 p-3 rounded bg-black/20 hover:bg-black/40 border border-transparent hover:border-white/5 transition-colors min-w-0">
                              <Checkbox key={`high-${settings.smtpTriggerOnHigh}`} id="smtpTriggerOnHigh" name="smtpTriggerOnHigh" value="on" defaultChecked={settings.smtpTriggerOnHigh} className="flex-shrink-0" />
                              <Label htmlFor="smtpTriggerOnHigh" className="text-sm cursor-pointer select-none truncate">Dispatch on HIGH Escalations</Label>
                            </div>
                            <div className="flex items-center space-x-3 p-3 rounded bg-black/20 hover:bg-black/40 border border-transparent hover:border-white/5 transition-colors min-w-0">
                              <Checkbox key={`assign-${settings.smtpTriggerOnAssign}`} id="smtpTriggerOnAssign" name="smtpTriggerOnAssign" value="on" defaultChecked={settings.smtpTriggerOnAssign} className="flex-shrink-0" />
                              <Label htmlFor="smtpTriggerOnAssign" className="text-sm cursor-pointer select-none text-emerald-300 truncate">Dispatch on Operator Assignment</Label>
                            </div>
                            <div className="flex items-center space-x-3 p-3 rounded bg-black/20 hover:bg-black/40 border border-transparent hover:border-white/5 transition-colors min-w-0">
                              <Checkbox key={`res-${settings.smtpTriggerOnResolution}`} id="smtpTriggerOnResolution" name="smtpTriggerOnResolution" value="on" defaultChecked={settings.smtpTriggerOnResolution} className="flex-shrink-0" />
                              <Label htmlFor="smtpTriggerOnResolution" className="text-sm cursor-pointer select-none truncate">Dispatch to Reporter on RESOLVED/CLOSED</Label>
                            </div>
                            <div className="flex items-center space-x-3 p-3 rounded bg-black/20 hover:bg-black/40 border border-transparent hover:border-rose-500/20 transition-colors min-w-0">
                              <Checkbox key={`comp-${settings.smtpTriggerOnAssetCompromise}`} id="smtpTriggerOnAssetCompromise" name="smtpTriggerOnAssetCompromise" value="on" defaultChecked={settings.smtpTriggerOnAssetCompromise} />
                              <Label htmlFor="smtpTriggerOnAssetCompromise" className="text-sm cursor-pointer select-none text-rose-300">Dispatch to SECOPS on Asset COMPROMISED</Label>
                            </div>
                            <div className="flex items-center space-x-3 p-3 rounded bg-black/20 hover:bg-black/40 border border-transparent hover:border-white/5 transition-colors">
                              <Checkbox key={`user2-${settings.smtpTriggerOnNewUser}`} id="smtpTriggerOnNewUser" name="smtpTriggerOnNewUser" value="on" defaultChecked={settings.smtpTriggerOnNewUser} />
                              <Label htmlFor="smtpTriggerOnNewUser" className="text-sm cursor-pointer select-none">Dispatch to ADMIN on New User Registration</Label>
                            </div>
                            <div className="flex items-center space-x-3 p-3 rounded bg-black/20 hover:bg-black/40 border border-transparent hover:border-white/5 transition-colors">
                              <Checkbox key={`vuln-${settings.smtpTriggerOnNewVulnerability}`} id="smtpTriggerOnNewVulnerability" name="smtpTriggerOnNewVulnerability" value="on" defaultChecked={settings.smtpTriggerOnNewVulnerability} />
                              <Label htmlFor="smtpTriggerOnNewVulnerability" className="text-sm cursor-pointer select-none text-orange-300">Dispatch to ADMIN on New Vulnerability</Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ),
                "legal": (
                  <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="p-6 border border-white/10 rounded-xl bg-black/40 hover:bg-black/60 transition-colors">
                      <div className="mb-6 border-b border-white/10 pb-6">
                        <h3 className="text-xl font-bold tracking-wide text-white mb-2">Platform Licensing & Telemetry</h3>
                        <p className="text-sm text-muted-foreground">OpenTicket operates under a Dual-Licensing architecture to protect the ecosystem's integrity.</p>
                      </div>

                      <div className="space-y-6 text-sm text-foreground/80 leading-relaxed">
                        <div className="space-y-2 bg-black/30 p-5 rounded-lg border border-white/5 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-3 opacity-10">
                            <Scale className="w-20 h-20" />
                          </div>
                          <h4 className="text-emerald-400 font-bold uppercase tracking-wider">1. Open Source Core (AGPL-3.0)</h4>
                          <p>Unless explicitly sequestered in Enterprise modules, the OpenTicket core routing logic is provisioned under the GNU Affero General Public License Version 3 (AGPL-3.0).</p>
                          <p className="text-rose-400/90 italic text-xs mt-2 font-mono">Warning: Monetizing this software over a network (SaaS loophole) without relinquishing your proprietary modifications constitutes a critical breach of trust.</p>
                        </div>

                        <div className="space-y-2 bg-blue-900/10 p-5 rounded-lg border border-blue-500/20 relative overflow-hidden">
                          <h4 className="text-blue-400 font-bold uppercase tracking-wider">2. Cyber Sec Space Enterprise Edition</h4>
                          <p>Modules tagged as Enterprise (e.g., Advanced SAML/SSO, HA Clustering) are strictly proprietary.</p>
                          <p>Bypassing AGPL copyleft viral effects via embedded integrations necessitates an active Enterprise License Key acquired strictly from Cyber Sec Space.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }} 
            />

            <div className="pt-6 border-t border-white/10 mt-8 flex justify-end">
               <Button type="submit" size="lg" className="w-full sm:w-auto min-w-[240px] text-white bg-emerald-600 hover:bg-emerald-500 font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all uppercase tracking-widest text-sm flex items-center justify-center group h-12">
                 Apply All Directives <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
               </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
