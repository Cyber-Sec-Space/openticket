import { auth } from "@/auth"
import { notFound } from "next/navigation"
import { ShieldAlert, UserPlus, Key, Mail, Fingerprint } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { createUserAction } from "./actions"

export default async function NewUserPage() {
  const session = await auth()
  
  if (!session?.user || !session.user.roles.includes('ADMIN')) {
    return notFound()
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8 animate-fade-in-up">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <UserPlus className="w-8 h-8 mr-3 text-emerald-400" /> Provision Identity
          </h1>
          <p className="text-muted-foreground mt-2">Generate and distribute overarching structural keys granting platform access.</p>
        </div>
      </header>
      
      <div className="glass-card rounded-xl p-8 border border-border shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-emerald-400">
           <Fingerprint size={120} />
        </div>
        
        <form action={createUserAction} className="space-y-6 relative z-10">
          <div className="space-y-3">
            <Label className="uppercase text-xs tracking-widest text-muted-foreground flex items-center gap-2">
               <Mail className="w-3 h-3" /> Contact Email
            </Label>
            <Input 
               name="email" 
               type="email" 
               required 
               placeholder="operator@openticket.local" 
               className="bg-black/30 border-white/10 focus:ring-emerald-400/50" 
            />
          </div>

          <div className="space-y-3">
            <Label className="uppercase text-xs tracking-widest text-muted-foreground">Display Moniker</Label>
            <Input 
               name="name" 
               type="text" 
               required 
               placeholder="Full Operative Name" 
               className="bg-black/30 border-white/10 focus:ring-emerald-400/50" 
            />
          </div>

          <div className="space-y-3">
            <Label className="uppercase text-xs tracking-widest text-muted-foreground flex items-center gap-2">
               <Key className="w-3 h-3 text-red-400" /> Initial Root Password
            </Label>
            <Input 
               name="password" 
               type="password" 
               required 
               placeholder="••••••••" 
               className="bg-black/30 border-white/10 focus:border-red-400/50 focus:ring-red-400/50" 
            />
            <p className="text-[10px] text-muted-foreground flex items-center">
               <ShieldAlert className="w-3 h-3 mr-1 text-red-500" /> Ensure keys are highly unguessable and distributed strictly out-of-band.
            </p>
          </div>

          <div className="space-y-3">
            <Label className="uppercase text-xs tracking-widest text-muted-foreground">Privilege Tier Selection</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 bg-black/20 p-4 rounded-md border border-white/10">
                <Checkbox id="role-reporter" name="roles" value="REPORTER" defaultChecked />
                <Label htmlFor="role-reporter" className="cursor-pointer text-sm">REPORTER</Label>
              </div>
              <div className="flex items-center space-x-3 bg-black/20 p-4 rounded-md border border-white/10">
                <Checkbox id="role-secops" name="roles" value="SECOPS" />
                <Label htmlFor="role-secops" className="cursor-pointer text-sm text-blue-400">SECOPS</Label>
              </div>
              <div className="flex items-center space-x-3 bg-black/20 p-4 rounded-md border border-white/10">
                <Checkbox id="role-admin" name="roles" value="ADMIN" />
                <Label htmlFor="role-admin" className="cursor-pointer text-sm text-primary">ADMIN</Label>
              </div>
              <div className="flex items-center space-x-3 bg-black/20 p-4 rounded-md border border-white/10">
                <Checkbox id="role-api" name="roles" value="API_ACCESS" />
                <Label htmlFor="role-api" className="cursor-pointer text-sm text-purple-400">API_ACCESS</Label>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex justify-end">
            <Button type="submit" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] text-white font-bold tracking-wide">
              Mint Identity Record
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
