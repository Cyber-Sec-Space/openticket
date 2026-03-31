import { auth } from "@/auth"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { Bug, ShieldAlert, Server, Trash2, ShieldCheck, Activity } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateVulnStatusAction, deleteVulnerabilityAction } from "./actions"
import Link from "next/link"

interface MatchProps {
  params: { id: string }
}

export default async function VulnerabilityDetailPage({ params }: MatchProps) {
  const { id } = await params
  const session = await auth()
  
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SECOPS')) {
    return notFound()
  }

  const vuln = await db.vulnerability.findUnique({
    where: { id },
    include: {
      affectedAssets: true
    }
  })

  if (!vuln) {
    return notFound()
  }

  const cvssColor = 
    vuln.cvssScore && vuln.cvssScore >= 9.0 ? 'text-red-500' :
    vuln.cvssScore && vuln.cvssScore >= 7.0 ? 'text-orange-500' :
    vuln.cvssScore && vuln.cvssScore >= 4.0 ? 'text-yellow-400' :
    'text-blue-400';

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in-up">
      <header className="flex justify-between items-start pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-3 mb-2">
             <Badge variant="outline" className={`font-mono bg-black/50 ${cvssColor} border-${cvssColor.replace('text-', '')}/30`}>
                CVSS: {vuln.cvssScore !== null ? vuln.cvssScore.toFixed(1) : 'N/A'}
             </Badge>
             <Badge variant={vuln.severity === 'CRITICAL' ? 'destructive' : 'secondary'} className="font-mono bg-black/50">
                {vuln.severity.replace(/_/g, ' ')}
             </Badge>
             <Badge variant="outline" className="font-mono bg-blue-950/30 text-blue-400 border-blue-500/30">
                {vuln.status.replace(/_/g, ' ')}
             </Badge>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            {vuln.title}
          </h1>
          {vuln.cveId && (
            <p className="text-muted-foreground mt-2 font-mono flex items-center">
              <Bug className="w-4 h-4 mr-2" /> {vuln.cveId}
            </p>
          )}
        </div>
        
        {/* Admin Controls */}
        <div className="flex space-x-4 items-center">
           {session.user.role === 'ADMIN' && (
             <form action={deleteVulnerabilityAction}>
                <input type="hidden" name="vulnId" value={vuln.id} />
                <Button variant="destructive" size="sm" type="submit" className="opacity-70 hover:opacity-100 flex items-center">
                  <Trash2 className="w-4 h-4 mr-2" /> Purge Record
                </Button>
             </form>
           )}
        </div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column - Details */}
        <div className="md:col-span-2 space-y-8">
          <div className="glass-card rounded-xl p-6 border border-border shadow-2xl relative overflow-hidden">
             <h2 className="text-lg font-bold tracking-tight mb-4 flex items-center text-primary/80">
               <ShieldAlert className="w-5 h-5 mr-3" /> Technical Analysis & Remediation
             </h2>
             <div className="bg-black/40 rounded-lg p-5 border border-white/5 whitespace-pre-wrap font-mono text-sm leading-relaxed text-muted-foreground/90">
                {vuln.description}
             </div>
             <p className="text-xs text-muted-foreground/30 mt-4 text-right">
                Discovered: {new Date(vuln.createdAt).toLocaleString()}
             </p>
          </div>
          
          <div className="glass-card rounded-xl p-6 border border-border mt-8 shadow-2xl">
            <h2 className="text-lg font-bold tracking-tight mb-4 flex items-center text-primary/80">
               <Activity className="w-5 h-5 mr-3 text-purple-400" /> Operational Posture
            </h2>
            <form action={updateVulnStatusAction} className="flex items-center space-x-4">
               <input type="hidden" name="vulnId" value={vuln.id} />
               <Select key={`vuln-status-${vuln.status}`} name="status" defaultValue={vuln.status}>
                  <SelectTrigger className="w-[200px] bg-black/30 border-white/10">
                     <SelectValue placeholder="Update Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-black/95 shadow-2xl border-white/10">
                     <SelectItem value="OPEN" className="text-red-400 font-bold">OPEN / UNPATCHED</SelectItem>
                     <SelectItem value="MITIGATED" className="text-yellow-400">MITIGATED (Temp Fix)</SelectItem>
                     <SelectItem value="RESOLVED" className="text-green-400 font-bold">RESOLVED</SelectItem>
                  </SelectContent>
               </Select>
               <Button type="submit" variant="secondary" className="shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                  Apply State
               </Button>
            </form>
          </div>
        </div>

        {/* Right Column - Affected Assets Dashboard */}
        <div className="glass-card rounded-xl border border-border shadow-2xl flex flex-col items-center">
            <div className="w-full text-left p-6 border-b border-white/5 flex items-center bg-black/20">
               <Server className="w-5 h-5 mr-3 text-red-400" /> 
               <h2 className="font-bold tracking-tight text-red-500">Infected Infrastructure</h2>
            </div>
            
            <div className="w-full p-4 space-y-3 flex-1">
               {vuln.affectedAssets.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center p-6 opacity-50 space-y-2">
                    <ShieldCheck className="w-8 h-8 text-green-500" />
                    <p className="text-muted-foreground text-sm font-mono text-center">Zero Assets Currently Mapping to this Vulnerability Vector.</p>
                 </div>
               ) : (
                 <ul className="space-y-2">
                    {vuln.affectedAssets.map(asset => (
                      <li key={asset.id} className="bg-black/40 border border-red-500/20 rounded-lg p-3 hover:bg-black/60 transition-colors">
                        <Link href={`/assets`} className="flex justify-between items-center group">
                          <div>
                            <p className="font-bold font-mono text-sm text-red-400 group-hover:text-red-300 transition-colors">{asset.name}</p>
                            <span className="text-[10px] text-muted-foreground uppercase">{asset.type.replace(/_/g, ' ')} • {asset.status.replace(/_/g, ' ')}</span>
                          </div>
                          {asset.ipAddress && <span className="text-xs bg-red-950/50 text-red-300 px-2 py-1 flex items-center rounded border border-red-900/50 font-mono tracking-tighter">{asset.ipAddress}</span>}
                        </Link>
                      </li>
                    ))}
                 </ul>
               )}
            </div>
        </div>
      </div>
    </div>
  )
}
