import { auth } from "@/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ShieldAlert, Plus, Filter, ChevronLeft, ChevronRight } from "lucide-react"

export default async function IncidentsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const session = await auth()
  if (!session?.user) return null

  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || "1", 10);
  const TAKE = 10;
  
  const filterParams: any = {}
  
  // Hard RBAC rule: reporters only see their own tickets
  if (session.user.role === 'REPORTER') {
    filterParams.reporterId = session.user.id
  }

  // URL Filters
  if (resolvedParams.status && resolvedParams.status !== "ALL") filterParams.status = resolvedParams.status;
  if (resolvedParams.severity && resolvedParams.severity !== "ALL") filterParams.severity = resolvedParams.severity;

  const totalCount = await db.incident.count({ where: filterParams })
  const totalPages = Math.ceil(totalCount / TAKE) || 1

  const incidents = await db.incident.findMany({
    where: filterParams,
    include: {
      reporter: { select: { name: true } },
      assignee: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * TAKE,
    take: TAKE,
  })

  // Function to build safe URL for pagination
  const buildPageUrl = (newPage: number) => {
    const params = new URLSearchParams()
    if (resolvedParams.status) params.set("status", resolvedParams.status)
    if (resolvedParams.severity) params.set("severity", resolvedParams.severity)
    params.set("page", newPage.toString())
    return `/incidents?${params.toString()}`
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <ShieldAlert className="mr-3 text-primary h-8 w-8" /> Active Incidents
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Monitor, assign, and respond to ongoing security tickets across the enterprise.</p>
        </div>
        <Link href="/incidents/new">
          <Button className="bg-primary hover:bg-primary/80 text-primary-foreground shadow-[0_0_10px_rgba(0,255,200,0.3)]">
            <Plus className="w-4 h-4 mr-2" /> Report Incident
          </Button>
        </Link>
      </div>

      <div className="glass-card rounded-xl p-4 flex flex-wrap gap-4 items-center mb-6">
        <Filter className="w-5 h-5 text-muted-foreground mr-2" />
        <form method="GET" action="/incidents" className="flex gap-4 items-end flex-wrap">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Status</label>
            <select name="status" defaultValue={resolvedParams.status || "ALL"} className="h-9 px-3 rounded-md border border-border/60 bg-black/50 text-sm text-foreground focus:ring-primary outline-none">
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PENDING_INFO">Pending Info</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Severity</label>
            <select name="severity" defaultValue={resolvedParams.severity || "ALL"} className="h-9 px-3 rounded-md border border-border/60 bg-black/50 text-sm text-foreground focus:ring-primary outline-none">
               <option value="ALL">All Severities</option>
               <option value="LOW">Low</option>
               <option value="MEDIUM">Medium</option>
               <option value="HIGH">High</option>
               <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <Button type="submit" variant="secondary" className="h-9 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 border-dashed">
            Apply Filters
          </Button>

          {(resolvedParams.status || resolvedParams.severity) && (
            <Link href="/incidents">
              <Button variant="ghost" className="h-9 text-muted-foreground">Clear</Button>
            </Link>
          )}
        </form>
      </div>

      <div className="glass-card rounded-xl overflow-hidden border border-border">
        <Table>
          <TableHeader className="bg-black/20">
            <TableRow className="border-border">
              <TableHead className="font-semibold text-primary">Key</TableHead>
              <TableHead className="font-semibold text-primary">Title</TableHead>
              <TableHead className="font-semibold text-primary">Severity</TableHead>
              <TableHead className="font-semibold text-primary">Status</TableHead>
              <TableHead className="font-semibold text-primary">Reporter</TableHead>
              <TableHead className="font-semibold text-primary border-r border-border/20">Assignee</TableHead>
              <TableHead className="font-semibold text-primary text-right">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                  No incidents found matching your criteria.
                </TableCell>
              </TableRow>
            ) : incidents.map(incident => (
              <TableRow 
                key={incident.id} 
                className="cursor-pointer border-border hover:bg-primary/10 transition-colors relative group"
              >
                <TableCell className="font-mono text-xs text-muted-foreground">
                  <Link href={`/incidents/${incident.id}`} className="absolute inset-0" aria-label={`View ${incident.title}`} />
                  TKT-{incident.id.substring(0,6).toUpperCase()}
                </TableCell>
                <TableCell className="font-medium text-foreground">
                  {incident.title}
                </TableCell>
                <TableCell>
                  <Badge className={`bg-transparent border ${incident.severity === 'CRITICAL' ? 'border-destructive text-destructive shadow-[0_0_10px_rgba(255,50,50,0.2)] animate-pulse' : 'border-primary text-primary'}`}>
                    {incident.severity}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground bg-black/30">
                    {incident.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{incident.reporter?.name || "Unknown"}</TableCell>
                <TableCell className="text-muted-foreground font-medium border-r border-border/20">{incident.assignee?.name || <span className="text-muted-foreground/50 italic">Unassigned</span>}</TableCell>
                <TableCell className="text-right text-muted-foreground text-sm font-mono">{incident.createdAt.toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        <div className="border-t border-border/50 bg-black/10 p-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-white">{incidents.length > 0 ? (page - 1) * TAKE + 1 : 0}</span> to <span className="font-medium text-white">{Math.min(page * TAKE, totalCount)}</span> of <span className="font-medium text-white">{totalCount}</span> results
          </p>
          <div className="flex gap-2">
            <Link href={page > 1 ? buildPageUrl(page - 1) : "#"} className={page <= 1 ? "pointer-events-none opacity-50" : ""}>
               <Button variant="outline" size="sm" className="bg-black/30 border-white/10 hover:bg-white/10"><ChevronLeft className="w-4 h-4 mr-1"/> Prev</Button>
            </Link>
            <div className="flex items-center justify-center px-4 font-mono text-sm border-x border-border/50">
               Pg {page} / {totalPages}
            </div>
            <Link href={page < totalPages ? buildPageUrl(page + 1) : "#"} className={page >= totalPages ? "pointer-events-none opacity-50" : ""}>
               <Button variant="outline" size="sm" className="bg-black/30 border-white/10 hover:bg-white/10">Next <ChevronRight className="w-4 h-4 ml-1"/></Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
