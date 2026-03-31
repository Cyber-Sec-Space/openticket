import { auth } from "@/auth"
import { notFound } from "next/navigation"
import { ShieldAlert, UserPlus, Key, Mail, Fingerprint } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createUserAction } from "./actions"

export default async function NewUserPage() {
  const session = await auth()
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    return notFound()
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8 animate-fade-in-up">
      <header className="flex justify-between items-center pb-6 border-b border-white/10">
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
            <Select name="role" defaultValue="REPORTER">
              <SelectTrigger className="bg-black/30 border-white/10">
                <SelectValue placeholder="Assign Role" />
              </SelectTrigger>
              <SelectContent className="bg-black/95 shadow-2xl">
                <SelectItem value="REPORTER">REPORTER</SelectItem>
                <SelectItem value="SECOPS" className="text-blue-400 font-medium">SECOPS</SelectItem>
                <SelectItem value="ADMIN" className="text-primary font-bold">ADMIN</SelectItem>
              </SelectContent>
            </Select>
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
