import { auth } from "@/auth"
import { db } from "@/lib/db"
import { ShieldCheck, UserCog, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { updateProfile } from "./actions"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user) return null

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
    </div>
  )
}
