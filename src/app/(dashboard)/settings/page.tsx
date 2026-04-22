import React from "react"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { hasPermission } from "@/lib/auth-utils"
import { activePlugins } from "@/plugins"
import { parsePluginConfig } from "@/lib/plugins/crypto"
import { createPluginContext } from "@/lib/plugins/sdk-context"
import { ShieldCheck, UserCog, Mail } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { updateProfile } from "./actions"
import { TwoFactorPanel } from "./two-factor-panel"
import { NotificationPanel } from "./notification-panel"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) { redirect("/login"); return null; }

  const user = await db.user.findUnique({ where: { id: session.user.id }, include: { customRoles: { select: { name: true, permissions: true } } } })

  const activePluginStates = await db.pluginState.findMany({ where: { isActive: true } });
  
  if (!user) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in-up">
        <div className="glass-card rounded-xl border border-destructive/50 p-8 shadow-2xl flex flex-col items-center justify-center text-center space-y-4">
          <h2 className="text-xl font-bold text-destructive">Account Desynchronization Detected</h2>
          <p className="text-muted-foreground w-3/4">Your current browser session identity no longer exists in our authoritative records (it was likely expunged or you are using phantom data). Please terminate this local session immediately.</p>
        </div>
      </div>
    )
  }

  // Flatten and dedup permissions
  const allPermissions = Array.from(new Set(user.customRoles.flatMap(r => r.permissions)))

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <UserCog className="w-8 h-8 mr-3 text-blue-400" /> Identity Preferences
          </h1>
          <p className="text-muted-foreground mt-2">Manage your personal identification matrix mapping across the perimeter.</p>
        </div>
        <div className="flex items-center gap-3">
          {hasPermission(session, 'ISSUE_API_TOKENS') && (
             <Link href="/settings/tokens">
                <Button className="bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]">
                  API Tokens
                </Button>
             </Link>
          )}
        </div>
      </header>

      <div className="glass-card rounded-xl overflow-hidden border border-border mt-8 shadow-2xl">
        <CardHeader className="border-b border-white/5 bg-black/20 p-6">
          <CardTitle className="text-primary tracking-wide">Configuration Matrix</CardTitle>
          <CardDescription>Update your public facing designations.</CardDescription>
        </CardHeader>

        <div className="p-6">
          <form action={updateProfile} className="space-y-6">
            <div className="space-y-3">
              <Label className="uppercase text-xs tracking-widest text-muted-foreground">Unique Security ID (UID)</Label>
              <Input disabled defaultValue={`ID-${user.id.substring(0, 8).toUpperCase()}`} className="bg-black/50 border-white/5 opacity-50 font-mono text-sm" />
            </div>

            <div className="space-y-3">
              <Label className="uppercase text-xs tracking-widest text-muted-foreground">Contact Email</Label>
              <div className="relative">
                <Mail className="absolute w-4 h-4 left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input disabled defaultValue={user.email || ""} className="bg-black/50 border-white/5 opacity-50 pl-10 text-sm" />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="uppercase text-xs tracking-widest justify-between flex">
                <span className="text-primary/80">Display Moniker</span>
                <span className="text-muted-foreground opacity-50 lowercase">mutable</span>
              </Label>
              <Input name="name" defaultValue={user.name || ""} className="bg-black/30 border-primary/20 focus:ring-primary/50 font-semibold" required />
            </div>

            <div className="space-y-4">
              <Label className="uppercase text-xs tracking-widest text-muted-foreground flex justify-between items-center">
                <span>Operational Privilege Tier</span>
                {hasPermission(session, 'VIEW_SYSTEM_SETTINGS') && (
                  <span className="flex items-center text-primary text-xs gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Core Staff
                  </span>
                )}
              </Label>
              <div className="p-5 bg-black/20 rounded-lg border border-white/5 space-y-4">
                <div className="flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground/60 font-semibold">Active Roles</span>
                  <div className="flex flex-wrap gap-2">
                    {user.customRoles.map(r => (
                      <span key={r.name} className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md text-xs font-mono font-medium tracking-wide">
                        {r.name}
                      </span>
                    ))}
                    {user.customRoles.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">No assigned roles</span>
                    )}
                  </div>
                </div>
                
                {allPermissions.length > 0 && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground/60 font-semibold">Effective Capabilities</span>
                    <div className="flex flex-wrap gap-2">
                      {allPermissions.map(p => (
                        <span key={p} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-mono tracking-wider">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>


            <Button type="submit" className="w-32 text-white bg-blue-600 hover:bg-blue-500 font-semibold shadow-[0_0_15px_rgba(0,100,255,0.3)]">
              Apply Layout
            </Button>
          </form>

          <div className="pt-4">
            <TwoFactorPanel isEnabled={user.isTwoFactorEnabled} />
            <NotificationPanel user={user} />
          </div>
        </div>
      </div>

      {/* Dynamic Plugin Settings Panels */}
      <div className="space-y-8 mt-8">
        {await Promise.all(activePlugins.map(async plugin => {
          const state = activePluginStates.find(s => s.id === plugin.manifest.id);
          if (!state || !plugin.ui?.settingsPanels) return null;

          const config = state.configJson ? parsePluginConfig(state.configJson) : {};
          const context = await createPluginContext(plugin.manifest.id, plugin.manifest.name);

          return (
            <React.Fragment key={plugin.manifest.id}>
              {plugin.ui.settingsPanels.map((Panel, idx) => (
                <Panel key={`${plugin.manifest.id}-panel-${idx}`} api={context.api} config={config} />
              ))}
            </React.Fragment>
          )
        }))}
      </div>
    </div>
  )
}
