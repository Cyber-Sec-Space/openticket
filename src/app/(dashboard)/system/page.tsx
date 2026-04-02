import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { sl } from 'date-fns/locale' // Just in case layout needs it later
import { Sliders, ShieldCheck, UserPlus, Fingerprint, ShieldAlert } from "lucide-react"
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
  if (!session?.user || !session.user.roles.includes('ADMIN')) {
    redirect("/login")
  }

  const settings = await db.systemSetting.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      allowRegistration: true,
      requireGlobal2FA: false,
      defaultUserRoles: ["REPORTER"],
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

              {/* Default Role Select */}
              <div className="space-y-3 p-5 border border-white/10 rounded-md bg-black/20">
                <Label className="text-sm font-semibold tracking-wide text-primary/80">Default Initialization Privilege</Label>
                <p className="text-[11px] text-muted-foreground pb-2">
                   Select the initial access tier granted to newly registered operators.
                </p>
                <Select key={settings.defaultUserRoles[0] || "REPORTER"} name="defaultUserRoles" defaultValue={settings.defaultUserRoles[0] || "REPORTER"}>
                  <SelectTrigger className="w-[180px] bg-black/50 border-white/10">
                    <SelectValue placeholder="Select Tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REPORTER">REPORTER</SelectItem>
                    <SelectItem value="SECOPS">SECOPS</SelectItem>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
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
