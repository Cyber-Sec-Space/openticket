import { auth } from "@/auth"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bug, Plus, ShieldCheck, ShieldAlert, Shield } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default async function VulnerabilitiesPage() {
  const session = await auth()
  
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SECOPS')) {
    return notFound()
  }

  const vulnerabilities = await db.vulnerability.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      affectedAssets: true
    }
  })

  // Helper logic mapping severity to tailwind variables
  const getSeverityStyle = (severity: string, score: number | null) => {
    if (score && score >= 9.0) return "border-red-500/50 text-red-500 bg-red-500/10"
    if (severity === 'CRITICAL') return "border-red-500/50 text-red-500 bg-red-500/10"
    if (severity === 'HIGH') return "border-orange-500/50 text-orange-500 bg-orange-500/10"
    if (severity === 'MEDIUM') return "border-yellow-500/50 text-yellow-500 bg-yellow-500/10"
    return "border-emerald-500/50 text-emerald-500 bg-emerald-500/10"
  }

  const getStatusBadge = (status: string) => {
    if (status === 'OPEN') return "border-red-400 text-red-400 font-bold"
    if (status === 'MITIGATED') return "border-blue-400 text-blue-400 opacity-80"
    if (status === 'RESOLVED') return "border-emerald-400 text-emerald-400 opacity-60"
    return "border-white/20 text-white/60"
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <Bug className="mr-3 text-red-400 h-8 w-8" /> Vulnerability Tracking
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Long-term exposure metrics isolating patch management flows from realtime incidents.</p>
        </div>
        <div>
          <Link href="/vulnerabilities/new">
            <Button className="bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]">
              <Plus className="w-4 h-4 mr-2" /> Log Vulnerability
            </Button>
          </Link>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden border border-border mt-8 shadow-2xl">
        <Table>
          <TableHeader className="bg-black/20">
            <TableRow className="border-border">
               <TableHead className="font-semibold text-primary pl-6 w-[350px]">Threat Signature (CVE)</TableHead>
               <TableHead className="font-semibold text-primary text-center">Base Score</TableHead>
               <TableHead className="font-semibold text-primary text-center">Threat Level</TableHead>
               <TableHead className="font-semibold text-primary text-center">Mitigation Scope</TableHead>
               <TableHead className="font-semibold text-primary text-right pr-6">Remediation Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vulnerabilities.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                   Zero active exposures resolved. Infrastructure reads heavily hardened.
                 </TableCell>
               </TableRow>
            ) : vulnerabilities.map(vuln => (
               <TableRow key={vuln.id} className="hover:bg-red-400/5 border-border transition-colors">
                 <TableCell className="font-medium text-foreground py-4 pl-6">
                    <div className="flex flex-col">
                       <Link href={`/vulnerabilities/${vuln.id}`} className="hover:text-red-400 transition-colors">
                          <span className="block text-sm font-semibold truncate max-w-[300px]">{vuln.title}</span>
                       </Link>
                       <span className="text-xs font-mono text-muted-foreground bg-black/30 w-max px-2 py-0.5 rounded border border-white/5 mt-1.5 flex items-center">
                           <Bug className="w-3 h-3 mr-1.5 opacity-60" /> 
                           {vuln.cveId || "Local-0Day Exposure"}
                       </span>
                    </div>
                 </TableCell>
                 
                 <TableCell className="text-center font-mono text-sm py-4">
                    {vuln.cvssScore ? (
                        <div className="flex flex-col items-center">
                           <span className={`text-lg font-bold tracking-tighter ${vuln.cvssScore >= 9 ? 'text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]' : vuln.cvssScore >= 7 ? 'text-orange-500' : 'text-yellow-500'}`}>{vuln.cvssScore.toFixed(1)}</span>
                           <span className="text-[9px] opacity-40">CVSS v3</span>
                        </div>
                    ) : <span className="text-muted-foreground opacity-50">-</span>}
                 </TableCell>

                 <TableCell className="text-center py-4">
                    <Badge variant="outline" className={`bg-transparent border ${getSeverityStyle(vuln.severity, vuln.cvssScore)} uppercase tracking-widest text-[10px]`}>
                      {vuln.severity}
                    </Badge>
                 </TableCell>

                 <TableCell className="text-center font-mono py-4">
                    {vuln.affectedAssets.length > 0 ? (
                       <div className="flex items-center justify-center text-sm font-semibold text-cyan-400">
                          <ShieldAlert className="w-4 h-4 mr-2" />
                          {vuln.affectedAssets.length} <span className="text-xs font-sans font-normal text-muted-foreground ml-1">Nodes</span>
                       </div>
                    ) : (
                       <span className="text-xs opacity-50">Isolated</span>
                    )}
                 </TableCell>

                 <TableCell className="text-right pr-6 py-4">
                    <Badge variant="outline" className={`bg-black/50 ${getStatusBadge(vuln.status)}`}>
                       {vuln.status === 'RESOLVED' && <ShieldCheck className="w-3 h-3 mr-1.5" />}
                       {vuln.status}
                    </Badge>
                 </TableCell>
               </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
