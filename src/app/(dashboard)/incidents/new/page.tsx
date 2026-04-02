import { auth } from "@/auth"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ShieldAlert, ArrowLeft, Activity } from "lucide-react"
import { createIncident } from "./actions"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TagInput } from "@/components/ui/tag-input"

export default async function NewIncidentPage() {
  const session = await auth()
  if (!session?.user) return null

  let assets: any[] = []
  const hasPrivilege = session.user.roles.includes('ADMIN') || session.user.roles.includes('SECOPS')
  if (hasPrivilege) {
    assets = await db.asset.findMany({ select: { id: true, name: true } })
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex items-center space-x-4 mb-8">
        <Link href="/incidents">
          <Button variant="ghost" className="text-muted-foreground hover:text-white px-2">
            <ArrowLeft className="w-5 h-5 mr-2" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center text-white">
            <ShieldAlert className="mr-3 text-primary h-8 w-8" /> Initialize Report
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Create a new security event payload for immediate inspection.</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        <div className="p-8">
          {/* Note: In a production app with Shadcn UI Form, use react-hook-form. For this MVP we use native HTML forms mapped to next-auth server actions. */}
          <form action={async (formData) => {
            "use server"
            const assetName = formData.get("assetName") as string
            const resolvedAssetId = !assetName 
              ? null 
              : assets.find(a => a.name === assetName)?.id || null
            
            const data = new FormData()
            for (const [key, value] of formData.entries()) {
              data.append(key, value)
            }
            data.set("assetId", resolvedAssetId || "")
            
            await createIncident({}, data)
          }} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm tracking-wide font-semibold text-primary">Incident Definition</Label>
              <Input 
                id="title" 
                name="title" 
                placeholder="Log identifier e.g., Anomalous inbound connection dropped" 
                className="bg-black/30 border-white/10 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50 transition-all font-mono text-sm py-6"
                required 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="type" className="text-sm tracking-wide font-semibold text-primary">Category</Label>
                <div className="relative">
                  <Select name="type" defaultValue="OTHER">
                    <SelectTrigger className="flex h-12 w-full appearance-none rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all">
                      <SelectValue placeholder="Select Threat Classification..." />
                    </SelectTrigger>
                    <SelectContent className="bg-black/95 border border-border/60 shadow-2xl backdrop-blur-md">
                      <SelectItem value="MALWARE">Malware Infection</SelectItem>
                      <SelectItem value="PHISHING">Phishing Attempt</SelectItem>
                      <SelectItem value="DATA_BREACH" className="text-destructive">Data Breach</SelectItem>
                      <SelectItem value="UNAUTHORIZED_ACCESS">Unauthorized Access</SelectItem>
                      <SelectItem value="NETWORK_ANOMALY">Network Anomaly</SelectItem>
                      <SelectItem value="OTHER" className="text-muted-foreground">Other / Triage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity" className="text-sm tracking-wide font-semibold text-primary">Threat Severity</Label>
                <div className="relative">
                  <Select name="severity" defaultValue="LOW">
                     <SelectTrigger className="flex h-12 w-full appearance-none rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all">
                       <SelectValue placeholder="Assess Initial Threat Level..." />
                     </SelectTrigger>
                     <SelectContent className="bg-black/95 border border-border/60 shadow-2xl backdrop-blur-md">
                       <SelectItem value="LOW">Low</SelectItem>
                       <SelectItem value="MEDIUM" className="text-yellow-400">Medium</SelectItem>
                       <SelectItem value="HIGH" className="text-orange-500">High</SelectItem>
                       <SelectItem value="CRITICAL" className="text-destructive font-bold">Critical</SelectItem>
                     </SelectContent>
                  </Select>
                </div>
              </div>

              {hasPrivilege && (
                <div className="space-y-2">
                  <Label htmlFor="assetId" className="text-sm tracking-wide font-semibold text-primary">Correlated Asset</Label>
                  <div className="relative">
                    <Select name="assetName" defaultValue="">
                       <SelectTrigger className="flex h-12 w-full appearance-none rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all">
                         <SelectValue placeholder="Associate Infrastructure (Optional)" />
                       </SelectTrigger>
                       <SelectContent className="bg-black/95 border border-border/60 shadow-2xl backdrop-blur-md">
                         <SelectItem value="" className="text-muted-foreground italic">None Selected</SelectItem>
                         {assets.map(asset => (
                           <SelectItem key={asset.id} value={asset.name} className="font-mono">{asset.name}</SelectItem>
                         ))}
                       </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags" className="text-sm tracking-wide font-semibold text-primary">Custom Tags</Label>
              <TagInput name="tags" placeholder="Add custom topology or markers (press Enter)..." />
              <p className="text-[10px] text-muted-foreground mt-1">Use tags to freely associate incidents with threat actors (e.g. #APT29) or vectors (e.g. #Ransomware).</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm tracking-wide font-semibold text-primary">Tactical Overview</Label>
              <Textarea 
                id="description" 
                name="description" 
                rows={6} 
                placeholder="Include TTP details, IOCs, and subsequent actions taken..." 
                className="bg-black/30 border-white/10 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50 transition-all font-mono text-sm resize-none"
                required 
              />
            </div>

            <Button type="submit" className="w-full h-12 text-md font-bold mt-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(0,255,200,0.4)] transition-all">
               Deploy Report Payload
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
