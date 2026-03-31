import { auth } from "@/auth"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ShieldAlert, ArrowLeft } from "lucide-react"
import { createIncident } from "./actions"
import Link from "next/link"

export default async function NewIncidentPage() {
  const session = await auth()
  if (!session?.user) return null

  const assets = await db.asset.findMany({
    orderBy: { name: 'asc' }
  })

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
            await createIncident({}, formData)
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
                  <select 
                    id="type" 
                    name="type" 
                    className="flex h-12 w-full appearance-none rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all pr-8"
                    defaultValue="OTHER"
                  >
                    <option value="MALWARE" className="bg-background">Malware Infection</option>
                    <option value="PHISHING" className="bg-background">Phishing Attempt</option>
                    <option value="DATA_BREACH" className="bg-background text-destructive">Data Breach</option>
                    <option value="UNAUTHORIZED_ACCESS" className="bg-background">Unauthorized Access</option>
                    <option value="NETWORK_ANOMALY" className="bg-background">Network Anomaly</option>
                    <option value="OTHER" className="bg-background text-muted-foreground">Other / Triage</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity" className="text-sm tracking-wide font-semibold text-primary">Threat Severity</Label>
                <div className="relative">
                  <select 
                    id="severity" 
                    name="severity" 
                    className="flex h-12 w-full appearance-none rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all pr-8"
                    defaultValue="LOW"
                  >
                    <option value="LOW" className="bg-background text-white">Low</option>
                    <option value="MEDIUM" className="bg-background text-yellow-400">Medium</option>
                    <option value="HIGH" className="bg-background text-orange-500">High</option>
                    <option value="CRITICAL" className="bg-background text-destructive font-bold">Critical</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assetId" className="text-sm tracking-wide font-semibold text-primary">Correlated Asset</Label>
                <div className="relative">
                  <select 
                    id="assetId" 
                    name="assetId" 
                    className="flex h-12 w-full appearance-none rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all pr-8"
                  >
                    <option value="" className="bg-background text-muted-foreground">None Selected</option>
                    {assets.map(asset => (
                      <option key={asset.id} value={asset.id} className="bg-background hover:bg-muted font-mono">{asset.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
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
