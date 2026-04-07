import { auth } from "@/auth"
import { hasPermission } from "@/lib/auth-utils"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Server, ArrowLeft } from "lucide-react"
import { createAsset } from "./actions"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default async function NewAssetPage() {
  const session = await auth()
  if (!session?.user || !hasPermission(session as any, 'MANAGE_ASSETS')) {
    return notFound()
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex items-center space-x-4 mb-8">
        <Link href="/assets">
          <Button variant="ghost" className="text-muted-foreground hover:text-white px-2">
            <ArrowLeft className="w-5 h-5 mr-2" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center text-white">
            <Server className="mr-3 text-primary h-8 w-8" /> Asset Registration
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Register a new enterprise node to the unified telemetry fabric.</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        <div className="p-8">
          <form action={createAsset} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name" className="text-sm tracking-wide font-semibold text-primary">Node Designation (Name)</Label>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="e.g., AD-DC-01 or NYC-FW-Core" 
                  className="bg-black/30 border-white/10 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50 transition-all font-mono text-sm py-6"
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type" className="text-sm tracking-wide font-semibold text-primary">Hardware / Software Profile</Label>
                <div className="relative">
                  <Select name="type" defaultValue="SERVER">
                    <SelectTrigger className="flex h-12 w-full appearance-none rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all">
                      <SelectValue placeholder="System Role..." />
                    </SelectTrigger>
                    <SelectContent className="bg-black/95 border border-border/60 shadow-2xl backdrop-blur-md">
                      <SelectItem value="SERVER">Server / Compute</SelectItem>
                      <SelectItem value="ENDPOINT">Client Endpoint</SelectItem>
                      <SelectItem value="NETWORK">Networking Hardware</SelectItem>
                      <SelectItem value="SOFTWARE">Software / Cloud Service</SelectItem>
                      <SelectItem value="OTHER">Other Telemetry Node</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm tracking-wide font-semibold text-primary">Deployment State</Label>
                <div className="relative">
                  <Select name="status" defaultValue="ACTIVE">
                     <SelectTrigger className="flex h-12 w-full appearance-none rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all">
                       <SelectValue placeholder="Current Op Status..." />
                     </SelectTrigger>
                     <SelectContent className="bg-black/95 border border-border/60 shadow-2xl backdrop-blur-md">
                       <SelectItem value="ACTIVE">Active Deployment</SelectItem>
                       <SelectItem value="INACTIVE">Offline / Disabled</SelectItem>
                       <SelectItem value="MAINTENANCE" className="text-yellow-400">Maintenance Window</SelectItem>
                       <SelectItem value="COMPROMISED" className="text-destructive font-bold">Compromised / Quarantined</SelectItem>
                     </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ipAddress" className="text-sm tracking-wide font-semibold text-primary">IPv4/v6 Address Overlay (Optional)</Label>
                <Input 
                  id="ipAddress" 
                  name="ipAddress" 
                  placeholder="10.0.0.X or External Signature..." 
                  className="bg-black/30 border-white/10 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50 transition-all font-mono text-sm py-6" 
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-md font-bold mt-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(0,255,200,0.4)] transition-all">
               Commit Node Registration
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
