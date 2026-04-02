import { auth } from "@/auth"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ClickableTableRow } from "@/components/ui/clickable-row"
import { Bug, Plus, ShieldCheck, ShieldAlert, Filter, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default async function VulnerabilitiesPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const session = await auth()
  
  if (!session?.user || (!session.user.roles.includes('ADMIN') && !session.user.roles.includes('SECOPS'))) {
    return notFound()
  }

  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || "1", 10);
  const TAKE = 10;

  const filterParams: any = {}

  if (resolvedParams.status && resolvedParams.status !== "ALL") filterParams.status = resolvedParams.status.replace(/ /g, '_');
  if (resolvedParams.severity && resolvedParams.severity !== "ALL") filterParams.severity = resolvedParams.severity;

  if (resolvedParams.q) {
    filterParams.OR = [
      { title: { contains: resolvedParams.q, mode: "insensitive" } },
      { cveId: { contains: resolvedParams.q, mode: "insensitive" } },
      { id: { contains: resolvedParams.q, mode: "insensitive" } }
    ]
  }

  const totalCount = await db.vulnerability.count({ where: filterParams })
  const totalPages = Math.ceil(totalCount / TAKE) || 1

  const vulnerabilities = await db.vulnerability.findMany({
    where: filterParams,
    orderBy: { createdAt: 'desc' },
    include: { affectedAssets: true },
    skip: (page - 1) * TAKE,
    take: TAKE,
  })

  const buildPageUrl = (newPage: number) => {
    const params = new URLSearchParams()
    if (resolvedParams.status) params.set("status", resolvedParams.status)
    if (resolvedParams.severity) params.set("severity", resolvedParams.severity)
    if (resolvedParams.q) params.set("q", resolvedParams.q)
    params.set("page", newPage.toString())
    return `/vulnerabilities?${params.toString()}`
  }

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <Bug className="mr-3 text-red-400 h-8 w-8" /> Vulnerability Tracking
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Long-term exposure metrics isolating patch management flows from realtime incidents.</p>
        </div>
        <div className="flex gap-4">
          <Link href="/api/export?type=vulnerability">
            <Button variant="secondary" className="bg-black/40 hover:bg-black/60 border border-white/20">
              Export CSV
            </Button>
          </Link>
          <Link href="/vulnerabilities/new">
            <Button className="bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]">
              <Plus className="w-4 h-4 mr-2" /> Log Vulnerability
            </Button>
          </Link>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4 flex flex-wrap gap-4 items-center mb-6 border border-border">
        <Filter className="w-5 h-5 text-muted-foreground mr-2" />
        <form method="GET" action="/vulnerabilities" className="flex flex-1 gap-4 items-end flex-wrap">

          <div className="space-y-1 flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                name="q"
                defaultValue={resolvedParams.q || ""}
                placeholder="Search Title, CVE-ID..."
                className="h-9 w-full pl-9 pr-3 rounded-md border border-border/60 bg-black/50 text-sm text-white focus:ring-2 focus:ring-red-400 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Status</label>
            <Select key={(resolvedParams.status || "ALL").replace(/_/g, ' ')} name="status" defaultValue={(resolvedParams.status || "ALL").replace(/_/g, ' ')}>
              <SelectTrigger className="h-9 w-[150px] px-3 rounded-md border border-border/60 bg-black/50 text-sm text-foreground focus:ring-2 focus:ring-red-400 outline-none transition-all">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-black/95 border-white/10 shadow-2xl backdrop-blur-md">
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="MITIGATED">Mitigated</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Severity</label>
            <Select key={`severity-${resolvedParams.severity || 'ALL'}`} name="severity" defaultValue={(resolvedParams.severity || "ALL").replace(/_/g, ' ')}>
              <SelectTrigger className="h-9 w-[150px] px-3 rounded-md border border-border/60 bg-black/50 text-sm text-foreground focus:ring-2 focus:ring-red-400 outline-none transition-all">
                <SelectValue placeholder="All Severities" />
              </SelectTrigger>
              <SelectContent className="bg-black/95 border-white/10 shadow-2xl backdrop-blur-md">
                <SelectItem value="ALL">All Severities</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM" className="text-yellow-400">Medium</SelectItem>
                <SelectItem value="HIGH" className="text-orange-500">High</SelectItem>
                <SelectItem value="CRITICAL" className="text-destructive font-bold">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" variant="secondary" className="h-9 bg-red-400/20 text-red-400 hover:bg-red-400/30 border border-red-400/30 border-dashed">
            Apply Filters
          </Button>

          {(resolvedParams.status || resolvedParams.severity || resolvedParams.q) && (
            <Link href="/vulnerabilities">
              <Button variant="ghost" className="h-9 text-muted-foreground hover:text-white">Clear</Button>
            </Link>
          )}
        </form>
      </div>

      <div className="glass-card rounded-xl overflow-hidden border border-border mb-8 shadow-2xl">
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
                   <span className="block text-xl mb-2">🛡️</span>
                   Zero active exposures resolved. Infrastructure reads heavily hardened.
                 </TableCell>
               </TableRow>
            ) : vulnerabilities.map(vuln => (
               <ClickableTableRow 
                  key={vuln.id} 
                  href={`/vulnerabilities/${vuln.id}`} 
                  className="hover:bg-red-400/5 hover:border-red-500/30 border-border transition-all duration-200 group relative"
               >
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
                      {vuln.severity.replace(/_/g, ' ')}
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
                       {vuln.status.replace(/_/g, ' ')}
                    </Badge>
                 </TableCell>
               </ClickableTableRow>
            ))}
          </TableBody>
        </Table>
        
        {/* Pagination Footer */}
        <div className="border-t border-border/50 bg-black/10 p-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-white">{vulnerabilities.length > 0 ? (page - 1) * TAKE + 1 : 0}</span> to <span className="font-medium text-white">{Math.min(page * TAKE, totalCount)}</span> of <span className="font-medium text-white">{totalCount}</span> results
          </p>
          <div className="flex gap-2">
            <Link href={page > 1 ? buildPageUrl(page - 1) : "#"} className={page <= 1 ? "pointer-events-none opacity-50" : ""}>
              <Button variant="outline" size="sm" className="bg-black/30 border-white/10 hover:bg-white/10"><ChevronLeft className="w-4 h-4 mr-1" /> Prev</Button>
            </Link>
            <div className="flex items-center justify-center px-4 font-mono text-sm border-x border-border/50">
              Pg {page} / {totalPages}
            </div>
            <Link href={page < totalPages ? buildPageUrl(page + 1) : "#"} className={page >= totalPages ? "pointer-events-none opacity-50" : ""}>
              <Button variant="outline" size="sm" className="bg-black/30 border-white/10 hover:bg-white/10">Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
