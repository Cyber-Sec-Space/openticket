import { auth } from "@/auth"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { Bug, ShieldAlert, Server } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createVulnerabilityAction } from "./actions"

export default async function NewVulnerabilityPage() {
  const session = await auth()
  
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SECOPS')) {
    return notFound()
  }

  const assets = await db.asset.findMany({ select: { id: true, name: true, type: true, status: true, ipAddress: true } })

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8 animate-fade-in-up">
      <header className="flex justify-between items-center pb-6 border-b border-white/10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <ShieldAlert className="w-8 h-8 mr-3 text-red-500" /> Log Vulnerability
          </h1>
          <p className="text-muted-foreground mt-2">Initialize CVE tracking isolating localized weaknesses before active exploitation.</p>
        </div>
      </header>
      
      <div className="glass-card rounded-xl p-8 border border-border shadow-2xl relative overflow-hidden">
        
        <form action={createVulnerabilityAction} className="space-y-6 relative z-10">
          <div className="space-y-3">
            <Label className="uppercase text-xs tracking-widest text-muted-foreground">General Nomenclature</Label>
            <Input 
               name="title" 
               type="text" 
               required 
               placeholder="e.g. Log4Shell Remote Code Execution" 
               className="bg-black/30 border-white/10 focus:ring-red-500/50" 
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-3">
                <Label className="uppercase text-xs tracking-widest text-muted-foreground flex items-center">
                  <Bug className="w-3 h-3 mr-2" /> CVE Indicator
                </Label>
                <Input 
                   name="cveId" 
                   type="text" 
                   placeholder="CVE-2021-44228" 
                   className="bg-black/30 border-white/10 focus:ring-red-500/50 uppercase placeholder:normal-case font-mono" 
                />
             </div>
             
             <div className="space-y-3 flex flex-col items-end">
                <Label className="uppercase text-xs tracking-widest text-muted-foreground text-right w-full">CVSS v3 Score (0.0 - 10.0)</Label>
                <Input 
                   name="cvssScore" 
                   type="number" 
                   step="0.1" 
                   min="0" 
                   max="10" 
                   placeholder="9.8" 
                   className="bg-black/30 border-white/10 focus:ring-red-500/50 text-right font-mono tracking-widest text-lg w-[120px] text-red-400" 
                />
             </div>
          </div>

          <div className="space-y-3">
            <Label className="uppercase text-xs tracking-widest text-muted-foreground">Remediation Blueprint & Context</Label>
            <Textarea 
               name="description" 
               required 
               className="bg-black/30 border-white/10 min-h-[150px] focus:ring-red-500/50 font-mono text-sm leading-relaxed" 
               placeholder="Describe the affected vectors, proof of concepts, or link external mitigation guidelines..."
            />
          </div>

          <div className="space-y-3">
            <Label className="uppercase text-xs tracking-widest text-muted-foreground">Estimated Internal Threat Constraint</Label>
            <Select name="severity" defaultValue="HIGH">
              <SelectTrigger className="bg-black/30 border-white/10">
                <SelectValue placeholder="Assign Internal Severity" />
              </SelectTrigger>
              <SelectContent className="bg-black/95 shadow-2xl">
                <SelectItem value="LOW">LOW EXPOSURE</SelectItem>
                <SelectItem value="MEDIUM" className="text-yellow-400">MEDIUM EXPOSURE</SelectItem>
                <SelectItem value="HIGH" className="text-orange-500 font-medium">HIGH EXPOSURE</SelectItem>
                <SelectItem value="CRITICAL" className="text-red-500 font-bold">CRITICAL EXPOSURE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="uppercase text-xs tracking-widest text-muted-foreground flex items-center">
               <Server className="w-3 h-3 mr-2" /> Associated Infrastructure (Multi-Select Mapping)
            </Label>
            <div className="bg-black/20 border border-white/5 rounded-lg p-2 max-h-[200px] overflow-y-auto space-y-1">
               {assets.length === 0 ? (
                 <p className="text-xs text-muted-foreground italic text-center py-4">No active assets available in inventory for mapping.</p>
               ) : (
                 assets.map(asset => (
                   <div key={asset.id} className="flex items-center space-x-3 p-2 hover:bg-white/5 rounded-md transition-colors group">
                     <Checkbox 
                        id={`asset-${asset.id}`} 
                        name="assetIds" 
                        value={asset.id} 
                        className="border-white/20 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500 data-[state=checked]:text-white transition-all shadow-md mt-0.5" 
                     />
                     <div className="grid gap-0.5 leading-none flex-1">
                        <Label htmlFor={`asset-${asset.id}`} className="font-mono text-sm cursor-pointer group-hover:text-red-400 transition-colors inline-block w-full">
                           {asset.name} {asset.ipAddress && <span className="text-xs text-muted-foreground ml-2">({asset.ipAddress})</span>}
                        </Label>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50">
                           {asset.type} • {asset.status}
                        </p>
                     </div>
                   </div>
                 ))
               )}
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex justify-end">
            <Button type="submit" className="w-full sm:w-auto bg-red-600 hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)] text-white font-bold tracking-wide">
              Commit Vulnerability
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
