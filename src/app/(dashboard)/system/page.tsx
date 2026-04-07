import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { sl } from 'date-fns/locale' // Just in case layout needs it later
import { hasPermission } from "@/lib/auth-utils"
import { Sliders, ShieldCheck, UserPlus, Fingerprint, ShieldAlert, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateSystemSettings } from "./actions"
import { SlaSettingsPanel } from "./sla-settings-panel"

export default async function SystemSettingsPage() {
  const session = await auth()
  if (!session?.user || !hasPermission(session as any, 'VIEW_SYSTEM_SETTINGS')) {
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
      slaLowHours: 168
    }
  })

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <Sliders className="w-8 h-8 mr-3 text-emerald-400" /> System Configuration
          </h1>
          <p className="text-muted-foreground mt-2">Manage global operational protocols and perimeter boundaries.</p>
        </div>
      </header>

      <div className="glass-card rounded-xl overflow-hidden border border-border mt-8 shadow-2xl">
        <CardHeader className="border-b border-white/5 bg-black/20 p-6 flex flex-row items-center space-x-4">
          <ShieldCheck className="w-8 h-8 text-primary" />
          <div>
            <CardTitle className="text-primary tracking-wide">Platform Directives</CardTitle>
            <CardDescription>Adjust authorization routing and compliance.</CardDescription>
          </div>
        </CardHeader>

        <div className="p-6">
          <form action={updateSystemSettings} className="space-y-8">
            <div className="grid gap-6">
              
              {/* Registration Toggle */}
              <div className="flex flex-row items-center space-x-4 rounded-md border border-white/10 p-5 shadow-sm bg-black/20">
                <Checkbox key={String(settings.allowRegistration)} id="allowRegistration" name="allowRegistration" value="on" defaultChecked={settings.allowRegistration} />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="allowRegistration" className="text-sm font-semibold tracking-wide flex items-center cursor-pointer">
                    <UserPlus className="w-4 h-4 mr-2" /> Allow Public Registration
                  </Label>
                  <p className="text-[11px] text-muted-foreground pt-1 w-3/4">
                    Permit unauthenticated actors to generate new access credentials on the platform endpoint.
                  </p>
                </div>
              </div>

              {/* 2FA Toggle */}
              <div className="flex flex-row items-center space-x-4 rounded-md border border-white/10 p-5 shadow-sm bg-black/20">
                <Checkbox key={String(settings.requireGlobal2FA)} id="requireGlobal2FA" name="requireGlobal2FA" value="on" defaultChecked={settings.requireGlobal2FA} />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="requireGlobal2FA" className="text-sm font-semibold tracking-wide flex items-center cursor-pointer text-primary">
                    <Fingerprint className="w-4 h-4 mr-2" /> Enforce Global Two-Factor Verification
                  </Label>
                  <p className="text-[11px] text-muted-foreground pt-1 w-3/4">
                    Mandate TOTP verification universally. <span className="text-destructive">(Warning: Operator accounts without configured interlocks will be structurally locked out).</span>
                  </p>
                </div>
              </div>

              {/* Identity Verification Toggle */}
              <div className="flex flex-row items-center space-x-4 rounded-md border border-white/10 p-5 shadow-sm bg-black/20">
                <Checkbox key={`verify-${settings.requireEmailVerification}`} id="requireEmailVerification" name="requireEmailVerification" value="on" defaultChecked={settings.requireEmailVerification} />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="requireEmailVerification" className="text-sm font-semibold tracking-wide flex items-center cursor-pointer text-emerald-400">
                    <ShieldCheck className="w-4 h-4 mr-2" /> Require Email Verification
                  </Label>
                  <p className="text-[11px] text-muted-foreground pt-1 w-3/4">
                    Strictly block dashboard access for newly registered users until their email is cryptographically verified to belong to them. Action aborts if SMTP is offline.
                  </p>
                </div>
              </div>

              {/* System Platform URL */}
              <div className="space-y-3 p-5 border border-white/10 rounded-md bg-black/20">
                <Label htmlFor="systemPlatformUrl" className="text-sm font-semibold tracking-wide text-primary/80">System Resolving URL</Label>
                <p className="text-[11px] text-muted-foreground pb-2">
                   The fully qualified address (e.g. `https://soc.company.com`) utilized during auth emails bridging and redirection loops.
                </p>
                <Input 
                   id="systemPlatformUrl" 
                   name="systemPlatformUrl" 
                   defaultValue={settings.systemPlatformUrl} 
                   className="bg-black/40 border-white/10 text-white font-mono"
                />
              </div>

              {/* Default Role Select */}
              <div className="space-y-3 p-5 border border-white/10 rounded-md bg-black/20">
                <Label className="text-sm font-semibold tracking-wide text-primary/80">Default Initialization Privilege</Label>
                <p className="text-[11px] text-muted-foreground pb-2">
                   Select the initial access tier granted to newly registered operators.
                </p>
                <Select key={settings.defaultUserRoles?.[0]?.name || ""} name="defaultRoleId" defaultValue={settings.defaultUserRoles?.[0]?.name || ""}>
                  <SelectTrigger className="w-[280px] bg-black/50 border-white/10">
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

              <hr className="my-2 border-white/5" />

              {/* Rate Limiting Section */}
              <div className="space-y-4 p-5 border border-white/10 rounded-md bg-black/20">
                <h3 className="text-sm font-semibold tracking-wide text-primary/80 flex items-center">
                  <ShieldAlert className="w-4 h-4 mr-2" /> Security Defenses (Brute-Force Protection)
                </h3>
                
                <div className="flex flex-row items-center space-x-4 mb-4">
                  <Checkbox key={String(settings.rateLimitEnabled)} id="rateLimitEnabled" name="rateLimitEnabled" value="on" defaultChecked={settings.rateLimitEnabled} />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="rateLimitEnabled" className="text-sm font-medium cursor-pointer">
                      Enable Authentication Rate Limiting
                    </Label>
                    <p className="text-[11px] text-muted-foreground pt-1">
                      Enforce strict lockout windows to prevent automated credential stuffing and TOTP brute-forcing.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-8">
                  <div className="space-y-2">
                    <Label htmlFor="rateLimitMaxAttempts" className="text-xs text-muted-foreground">Max Allowed Failures</Label>
                    <Input 
                      id="rateLimitMaxAttempts" 
                      name="rateLimitMaxAttempts" 
                      type="number" 
                      defaultValue={settings.rateLimitMaxAttempts || 5} 
                      className="bg-black/30 w-32 border-white/10 font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rateLimitWindowMs" className="text-xs text-muted-foreground">Lockout Window (Milliseconds)</Label>
                    <Input 
                      id="rateLimitWindowMs" 
                      name="rateLimitWindowMs" 
                      type="number" 
                      defaultValue={settings.rateLimitWindowMs || 900000} 
                      className="bg-black/30 w-48 border-white/10 font-mono text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground italic">900000ms = 15 minutes</p>
                  </div>
                </div>
              </div>

              <hr className="my-2 border-white/5" />
              
              <div className="space-y-3 p-5 border border-white/10 rounded-md bg-black/20">
                <SlaSettingsPanel defaultSla={{ 
                  critical: settings.slaCriticalHours, 
                  high: settings.slaHighHours, 
                  medium: settings.slaMediumHours, 
                  low: settings.slaLowHours 
                }} />
              </div>

              <hr className="my-2 border-white/5" />

              <div className="space-y-4 p-5 border border-white/10 rounded-md bg-black/20">
                <h3 className="text-sm font-semibold tracking-wide text-primary/80 flex items-center">
                  <Mail className="w-4 h-4 mr-2" /> SMTP Mail Notifications
                </h3>

                <div className="flex flex-row items-center space-x-4 mb-4">
                  <Checkbox key={`smtp-${settings.smtpEnabled}`} id="smtpEnabled" name="smtpEnabled" value="on" defaultChecked={settings.smtpEnabled} />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="smtpEnabled" className="text-sm font-medium cursor-pointer">
                      Enable Email Dispatches
                    </Label>
                    <p className="text-[11px] text-muted-foreground pt-1">
                      If enabled, critical alerts and assignment notifications will be sent off-platform via this SMTP relay.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-8">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost" className="text-xs text-muted-foreground">SMTP Host</Label>
                    <Input id="smtpHost" name="smtpHost" defaultValue={settings.smtpHost || ""} placeholder="smtp.example.com" className="bg-black/30 border-white/10 font-mono text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort" className="text-xs text-muted-foreground">Port</Label>
                    <Input id="smtpPort" name="smtpPort" type="number" defaultValue={settings.smtpPort || 587} placeholder="587" className="bg-black/30 border-white/10 font-mono text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpUser" className="text-xs text-muted-foreground">User / Identity</Label>
                    <Input id="smtpUser" name="smtpUser" defaultValue={settings.smtpUser || ""} placeholder="alerts@example.com" className="bg-black/30 border-white/10 font-mono text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPassword" className="text-xs text-muted-foreground">Password (Leave blank to keep current)</Label>
                    <Input id="smtpPassword" name="smtpPassword" type="password" placeholder="••••••••" className="bg-black/30 border-white/10 font-mono text-sm" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="smtpFrom" className="text-xs text-muted-foreground">From Address Name</Label>
                    <Input id="smtpFrom" name="smtpFrom" defaultValue={settings.smtpFrom || ""} placeholder='"OpenTicket SOC" <noreply@openticket.local>' className="bg-black/30 border-white/10 font-mono text-sm" />
                  </div>
                </div>

                <hr className="my-4 border-white/5 mx-4" />
                
                <h4 className="text-xs font-semibold tracking-wide text-primary/80 ml-8 mb-2">Automated Triggers</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-8">
                  <div className="flex items-center space-x-3">
                    <Checkbox id="smtpTriggerOnCritical" name="smtpTriggerOnCritical" value="on" defaultChecked={settings.smtpTriggerOnCritical} />
                    <Label htmlFor="smtpTriggerOnCritical" className="text-sm font-medium cursor-pointer">Dispatch on CRITICAL Escalations</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox id="smtpTriggerOnHigh" name="smtpTriggerOnHigh" value="on" defaultChecked={settings.smtpTriggerOnHigh} />
                    <Label htmlFor="smtpTriggerOnHigh" className="text-sm font-medium cursor-pointer">Dispatch on HIGH Escalations</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox id="smtpTriggerOnAssign" name="smtpTriggerOnAssign" value="on" defaultChecked={settings.smtpTriggerOnAssign} />
                    <Label htmlFor="smtpTriggerOnAssign" className="text-sm font-medium cursor-pointer">Dispatch on Operator Assignment</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox id="smtpTriggerOnResolution" name="smtpTriggerOnResolution" value="on" defaultChecked={settings.smtpTriggerOnResolution} />
                    <Label htmlFor="smtpTriggerOnResolution" className="text-sm font-medium cursor-pointer">Dispatch to Reporter on RESOLVED/CLOSED</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox id="smtpTriggerOnAssetCompromise" name="smtpTriggerOnAssetCompromise" value="on" defaultChecked={settings.smtpTriggerOnAssetCompromise} />
                    <Label htmlFor="smtpTriggerOnAssetCompromise" className="text-sm font-medium cursor-pointer">Dispatch to ADMIN/SECOPS on Asset COMPROMISED</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox id="smtpTriggerOnNewUser" name="smtpTriggerOnNewUser" value="on" defaultChecked={settings.smtpTriggerOnNewUser} />
                    <Label htmlFor="smtpTriggerOnNewUser" className="text-sm font-medium cursor-pointer">Dispatch to ADMIN on New User Registration</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox id="smtpTriggerOnNewVulnerability" name="smtpTriggerOnNewVulnerability" value="on" defaultChecked={settings.smtpTriggerOnNewVulnerability} />
                    <Label htmlFor="smtpTriggerOnNewVulnerability" className="text-sm font-medium cursor-pointer">Dispatch to ADMIN on New Vulnerability</Label>
                  </div>
                </div>
              </div>

            </div>

            <hr className="my-6 border-white/10" />

            <div className="flex justify-end">
               <Button type="submit" className="w-48 text-white bg-blue-600 hover:bg-blue-500 font-bold shadow-[0_0_15px_rgba(0,100,255,0.3)] tracking-widest uppercase text-xs">
                 Apply Directives
               </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
