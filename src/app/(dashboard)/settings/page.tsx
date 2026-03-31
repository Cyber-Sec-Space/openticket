import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { ShieldCheck, ShieldAlert, UserCog, Mail, ServerCog, HardDrive, Cpu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { updateProfile } from "./actions"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await db.user.findUnique({ where: { id: session.user.id } })
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

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <header className="flex justify-between items-center pb-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <UserCog className="w-8 h-8 mr-3 text-blue-400" /> Identity Preferences
          </h1>
          <p className="text-muted-foreground mt-2">Manage your personal identification matrix mapping across the perimeter.</p>
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
                <Input disabled defaultValue={`ID-${user.id.substring(0,8).toUpperCase()}`} className="bg-black/50 border-white/5 opacity-50 font-mono text-sm" />
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

              <div className="space-y-3">
                <Label className="uppercase text-xs tracking-widest text-muted-foreground">Operational Privilege Tier</Label>
                <div className="p-3 bg-black/20 rounded-lg border border-white/5 font-mono text-xs flex justify-between items-center text-muted-foreground">
                   <span>{user.role}</span>
                   {user.role === 'ADMIN' && <ShieldCheck className="w-4 h-4 text-primary" />}
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                 <Button type="submit" className="w-32 bg-blue-600 hover:bg-blue-500 font-semibold shadow-[0_0_15px_rgba(0,100,255,0.3)]">
                   Apply Layout
                 </Button>
              </div>
           </form>
        </div>
      </div>

      {/* Exclusive ADMIN System Settings Block */}
      {user.role === 'ADMIN' && (
        <div className="glass-card rounded-xl overflow-hidden border border-red-500/20 mt-8 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
          <CardHeader className="border-b border-red-500/10 bg-red-950/20 p-6">
            <CardTitle className="text-red-400 tracking-wide flex items-center">
              <ServerCog className="w-5 h-5 mr-3 text-red-500" />
              Global System Administration
            </CardTitle>
            <CardDescription className="text-red-400/60">
              Authoritative parameter control. Modifications propagate instantaneously across all nodes.
            </CardDescription>
          </CardHeader>
          
          <div className="p-6 space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Parameter 1 */}
                <div className="bg-black/40 border border-white/5 p-4 rounded-lg flex justify-between items-center transition-colors hover:bg-black/60">
                   <div className="space-y-1">
                      <h4 className="font-semibold text-sm flex items-center"><ShieldAlert className="w-4 h-4 mr-2 text-orange-500"/> Strict MFA Enforcement</h4>
                      <p className="text-xs text-muted-foreground">Mandate multi-factor hooks globally.</p>
                   </div>
                   <Button variant="outline" size="sm" className="bg-transparent border-orange-500/50 text-orange-400 hover:bg-orange-500 hover:text-white">Enable</Button>
                </div>

                {/* Parameter 2 */}
                <div className="bg-black/40 border border-white/5 p-4 rounded-lg flex justify-between items-center transition-colors hover:bg-black/60">
                   <div className="space-y-1">
                      <h4 className="font-semibold text-sm flex items-center"><HardDrive className="w-4 h-4 mr-2 text-blue-400"/> Audit Ledger Archival</h4>
                      <p className="text-xs text-muted-foreground">Offload telemetry older than 90 days.</p>
                   </div>
                   <Button variant="outline" size="sm" className="bg-transparent border-blue-500/50 text-blue-400 hover:bg-blue-500 hover:text-white">Archive</Button>
                </div>
             </div>

             {/* Danger Zone */}
             <div className="pt-6 border-t border-red-500/10 mt-6">
                <h3 className="text-xs uppercase tracking-widest text-red-500 font-bold mb-4 flex items-center">
                  <Cpu className="w-4 h-4 mr-2" /> Danger Zone Engine Constraints
                </h3>
                <div className="bg-red-950/20 border border-red-500/30 rounded-lg p-5 flex justify-between items-center">
                   <div>
                     <h4 className="font-bold text-red-400 text-sm">Force DB Architecture Sync</h4>
                     <p className="text-xs text-red-400/60 mt-1 max-w-sm">Triggers Prisma structural rebuilds. May severely distrupt active SECOPS triage. Use strictly during deployment windows.</p>
                   </div>
                   <Button variant="destructive" className="font-bold tracking-widest text-xs shadow-[0_0_15px_rgba(220,38,38,0.5)] bg-red-600">
                     INITIALIZE REBUILD
                   </Button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
