import { auth } from "@/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ShieldAlert, Plus, Filter, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default async function IncidentsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const session = await auth()
  if (!session?.user) return null

  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || "1", 10);
  const TAKE = 10;

  const filterParams: any = {}

  // Hard RBAC rule: reporters only see their own tickets
  const hasPrivilege = session.user.roles.includes('ADMIN') || session.user.roles.includes('SECOPS')
  if (!hasPrivilege) {
    filterParams.reporterId = session.user.id
  }

  // URL Filters
  if (resolvedParams.status && resolvedParams.status !== "ALL") filterParams.status = resolvedParams.status.replace(/ /g, '_');
  if (resolvedParams.severity && resolvedParams.severity !== "ALL") filterParams.severity = resolvedParams.severity;

  if (resolvedParams.q) {
    filterParams.OR = [
      { title: { contains: resolvedParams.q, mode: "insensitive" } },
      { description: { contains: resolvedParams.q, mode: "insensitive" } },
      { id: { contains: resolvedParams.q, mode: "insensitive" } }
    ]
  }

  const totalCount = await db.incident.count({ where: filterParams })
  const totalPages = Math.ceil(totalCount / TAKE) || 1

  const incidents = await db.incident.findMany({
    where: filterParams,
    include: {
      reporter: { select: { name: true } },
      assignees: { select: { name: true } },
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
    if (resolvedParams.q) params.set("q", resolvedParams.q)
    params.set("page", newPage.toString())
    return `/incidents?${params.toString()}`
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <ShieldAlert className="mr-3 text-primary h-8 w-8" /> Active Incidents
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Monitor, assign, and respond to ongoing security tickets across the enterprise.</p>
        </div>
        <div className="flex gap-4">
          <Link href="/api/export?type=incident">
            <Button variant="secondary" className="bg-black/40 hover:bg-black/60 border border-white/20">
              Export CSV
            </Button>
          </Link>
          <Link href="/incidents/new">
            <Button className="bg-primary hover:bg-primary/80 text-primary-foreground shadow-[0_0_10px_rgba(0,255,200,0.3)]">
              <Plus className="w-4 h-4 mr-2" /> Report Incident
            </Button>
          </Link>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4 flex flex-wrap gap-4 items-center mb-6 border border-border">
        <Filter className="w-5 h-5 text-muted-foreground mr-2" />
        <form method="GET" action="/incidents" className="flex flex-1 gap-4 items-end flex-wrap">

          <div className="space-y-1 flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                name="q"
                defaultValue={resolvedParams.q || ""}
                placeholder="Search Title, INC-ID, or contents..."
                className="h-9 w-full pl-9 pr-3 rounded-md border border-border/60 bg-black/50 text-sm text-white placeholder:text-muted-foreground focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Status</label>
            <Select key={(resolvedParams.status || "ALL").replace(/_/g, ' ')} name="status" defaultValue={(resolvedParams.status || "ALL").replace(/_/g, ' ')}>
              <SelectTrigger className="h-9 w-[150px] px-3 rounded-md border border-border/60 bg-black/50 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none transition-all">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-black/95 border-white/10 shadow-2xl backdrop-blur-md">
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="IN PROGRESS">In Progress</SelectItem>
                <SelectItem value="PENDING INFO">Pending Info</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Severity</label>
            <Select key={`severity-${resolvedParams.severity || 'ALL'}`} name="severity" defaultValue={(resolvedParams.severity || "ALL").replace(/_/g, ' ')}>
              <SelectTrigger className="h-9 w-[150px] px-3 rounded-md border border-border/60 bg-black/50 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none transition-all">
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

          <Button type="submit" variant="secondary" className="h-9 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 border-dashed">
            Apply Filters
          </Button>

          {(resolvedParams.status || resolvedParams.severity || resolvedParams.q) && (
            <Link href="/incidents">
              <Button variant="ghost" className="h-9 text-muted-foreground hover:text-white">Clear</Button>
            </Link>
          )}
        </form>
      </div>

      <div className="glass-card rounded-xl overflow-hidden border border-border shadow-2xl">
        <Table>
          <TableHeader className="bg-black/20">
            <TableRow className="border-border">
              <TableHead className="font-semibold text-primary pl-6">Key</TableHead>
              <TableHead className="font-semibold text-primary">Title</TableHead>
              <TableHead className="font-semibold text-primary">Severity</TableHead>
              <TableHead className="font-semibold text-primary">Status</TableHead>
              <TableHead className="font-semibold text-primary">Reporter</TableHead>
              <TableHead className="font-semibold text-primary border-r border-border/20">Assignee</TableHead>
              <TableHead className="font-semibold text-primary border-r border-border/20">Target SLA</TableHead>
              <TableHead className="font-semibold text-primary text-right pr-6">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-40 text-muted-foreground">
                  <span className="block mb-2 text-xl">🔍</span>
                  No incidents found matching your search.
                </TableCell>
              </TableRow>
            ) : incidents.map(incident => {
              const isOverdue = incident.targetSlaDate && 
                new Date() > incident.targetSlaDate && 
                !['RESOLVED', 'CLOSED'].includes(incident.status);

              return (
              <TableRow
                key={incident.id}
                className={`cursor-pointer transition-colors relative group
                  ${isOverdue ? 'border-red-500/50 hover:bg-red-500/10 bg-[linear-gradient(45deg,rgba(255,0,0,0.05)_0%,transparent_100%)] shadow-[inset_4px_0_0_rgba(255,50,50,0.8)]' : 'border-border hover:bg-primary/10'}
                `}
              >
                <TableCell className={`font-mono text-xs pl-6 ${isOverdue ? 'text-red-400 font-bold' : 'text-muted-foreground'}`}>
                  <Link href={`/incidents/${incident.id}`} className="absolute inset-0" aria-label={`View ${incident.title}`} />
                  INC-{incident.id.substring(0, 6).toUpperCase()}
                </TableCell>
                <TableCell className="font-medium text-foreground flex items-center h-[52px]">
                  <span className="truncate max-w-[200px] xl:max-w-[300px]">{incident.title}</span>
                </TableCell>
                <TableCell>
                  <Badge className={`bg-transparent border ${incident.severity === 'CRITICAL' ? 'border-destructive text-destructive shadow-[0_0_10px_rgba(255,50,50,0.2)] animate-pulse' : 'border-primary text-primary'}`}>
                    {incident.severity.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`border-muted-foreground/30 bg-black/30 ${isOverdue ? 'text-red-400 border-red-500/30' : 'text-muted-foreground'}`}>
                    {incident.status.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{incident.reporter?.name || "Unknown"}</TableCell>
                <TableCell className="text-muted-foreground font-medium border-r border-border/20">
                  {incident.assignees.length > 0
                    ? incident.assignees.map(a => a.name).join(', ')
                    : <span className="text-muted-foreground/50 italic">Unassigned</span>}
                </TableCell>
                <TableCell className={`font-mono text-sm border-r border-border/20 ${isOverdue ? 'text-red-500 font-bold' : incident.targetSlaDate ? 'text-muted-foreground' : 'text-muted-foreground/40 italic'}`}>
                  {incident.targetSlaDate ? incident.targetSlaDate.toLocaleDateString() : '-'}
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-sm font-mono pr-6">
                  {incident.createdAt.toLocaleDateString()}
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        <div className="border-t border-border/50 bg-black/10 p-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-white">{incidents.length > 0 ? (page - 1) * TAKE + 1 : 0}</span> to <span className="font-medium text-white">{Math.min(page * TAKE, totalCount)}</span> of <span className="font-medium text-white">{totalCount}</span> results
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
