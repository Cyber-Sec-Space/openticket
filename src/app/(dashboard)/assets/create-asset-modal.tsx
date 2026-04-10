"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createAsset } from "./new/actions"

export function CreateAssetModal() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="bg-primary hover:bg-primary/80 text-primary-foreground shadow-[0_0_10px_rgba(0,255,200,0.3)]">
          <Plus className="w-4 h-4 mr-2" /> Register Asset
        </Button>
      } />
      <DialogContent className="w-full max-w-3xl bg-background/95 border border-border shadow-2xl p-6 md:p-8 overflow-y-auto max-h-[90vh] glass-card">
        <DialogTitle className="text-3xl font-extrabold tracking-tight mb-4 text-white">
          Asset Registration
        </DialogTitle>
        <p className="text-muted-foreground text-sm mb-6">Register a new enterprise node to the unified telemetry fabric.</p>
        
        <form action={createAsset} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name" className="text-sm tracking-wide font-semibold text-primary">Node Designation (Name)</Label>
              <Input 
                id="name" 
                name="name" 
                placeholder="e.g., AD-DC-01 or NYC-FW-Core" 
                className="bg-black/30 border-white/10 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50 transition-all font-mono text-sm py-6 text-white"
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
                    <SelectItem value="REPOSITORY">Code Repository</SelectItem>
                    <SelectItem value="CLOUD_RESOURCE">Cloud Resource / VM</SelectItem>
                    <SelectItem value="DOMAIN">DNS Domain</SelectItem>
                    <SelectItem value="IAM_ROLE">IAM Role</SelectItem>
                    <SelectItem value="SAAS_APP">SaaS Platform</SelectItem>
                    <SelectItem value="CONTAINER">Container / Pod</SelectItem>
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

            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="ipAddress" className="text-sm tracking-wide font-semibold text-primary">IPv4/v6 Address Overlay (Optional)</Label>
              <Input 
                id="ipAddress" 
                name="ipAddress" 
                placeholder="10.0.0.X..." 
                className="bg-black/30 border-white/10 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50 transition-all font-mono text-sm py-6 text-white" 
              />
            </div>

            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="externalId" className="text-sm tracking-wide font-semibold text-primary">Virtual Identifier (Optional)</Label>
              <Input 
                id="externalId" 
                name="externalId" 
                placeholder="e.g. github:RepoURL or AWS ARN..." 
                className="bg-black/30 border-white/10 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50 transition-all font-mono text-sm py-6 text-white" 
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-12 text-md font-bold mt-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(0,255,200,0.4)] transition-all">
             Commit Node Registration
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
