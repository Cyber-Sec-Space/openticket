import { auth } from "@/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileText, Filter, ChevronLeft, ChevronRight, Search, Activity, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { hasPermission } from "@/lib/auth-utils"

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const session = await auth()
  
  // Security Perimeter: Reporters cannot view system audits.
  if (!session?.user || !hasPermission(session as any, 'SYSTEM_SETTINGS')) {
     return notFound()
  }

  const resolvedParams = await searchParams;
  let page = parseInt(resolvedParams.page || "1", 10);
  if (Number.isNaN(page) || page < 1) page = 1;
  const TAKE = 15;

  const filterParams: any = {}

  if (resolvedParams.q) {
    filterParams.OR = [
      { action: { contains: resolvedParams.q, mode: "insensitive" } },
      { entityId: { contains: resolvedParams.q, mode: "insensitive" } },
      { user: { email: { contains: resolvedParams.q, mode: "insensitive" } } },
      { user: { name: { contains: resolvedParams.q, mode: "insensitive" } } },
    ]
  }

  const totalCount = await db.auditLog.count({ where: filterParams })
  const totalPages = Math.ceil(totalCount / TAKE) || 1

  const logs = await db.auditLog.findMany({
    where: filterParams,
    include: {
      user: {
        select: { name: true, email: true, isBot: true, customRoles: { select: { name: true } } }
      }
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * TAKE,
    take: TAKE,
  })

  // Build Pagination URLs safely
  const buildPageUrl = (newPage: number) => {
    const params = new URLSearchParams()
    if (resolvedParams.q) params.set("q", resolvedParams.q)
    params.set("page", newPage.toString())
    return `/audit?${params.toString()}`
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <FileText className="mr-3 text-purple-400 h-8 w-8" /> Global Audit Ledger
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Review immutable chronological event traces and modification telemetry.</p>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4 flex flex-wrap gap-4 items-center mb-6 border border-border">
        <Filter className="w-5 h-5 text-muted-foreground mr-2" />
        <form method="GET" action="/audit" className="flex flex-1 gap-4 items-end flex-wrap">
          <div className="space-y-1 flex-1 min-w-[300px]">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Search Forensic Trail</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                name="q"
                defaultValue={resolvedParams.q || ""}
                placeholder="Query by User Email, Action Type, or Entity ID..."
                className="h-9 w-full pl-9 pr-3 rounded-md border border-border/60 bg-black/50 text-sm text-white placeholder:text-muted-foreground focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              />
            </div>
          </div>

          <Button type="submit" variant="secondary" className="h-9 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30 border-dashed">
            Scan Ledger
          </Button>

          {resolvedParams.q && (
            <Link href="/audit">
              <Button variant="ghost" className="h-9 text-muted-foreground hover:text-white">Clear</Button>
            </Link>
          )}
        </form>
      </div>

      <div className="glass-card rounded-xl overflow-hidden border border-border shadow-2xl">
        <Table>
          <TableHeader className="bg-black/20">
            <TableRow className="border-border">
              <TableHead className="font-semibold text-primary pl-6">Timestamp</TableHead>
              <TableHead className="font-semibold text-primary">Operative</TableHead>
              <TableHead className="font-semibold text-primary">Domain</TableHead>
              <TableHead className="font-semibold text-primary">Action Executed</TableHead>
              <TableHead className="font-semibold text-primary">Payload Diff</TableHead>
              <TableHead className="font-semibold text-primary text-right pr-6">Target Key</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-40 text-muted-foreground">
                   <Activity className="w-8 h-8 mx-auto mb-3 opacity-20" />
                   No telemetry footprint matches the designated query.
                </TableCell>
              </TableRow>
            ) : logs.map(log => (
              <TableRow 
                key={log.id} 
                className="border-border/50 hover:bg-purple-500/5 transition-colors"
              >
                <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap pl-6">
                  {log.createdAt.toLocaleString()}
                </TableCell>
                
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-foreground text-sm flex items-center gap-1.5">
                      {log.user?.isBot && <Badge variant="outline" className="text-[9px] bg-primary/10 border-primary/30 text-primary px-1 hover:bg-primary/20 py-0 h-4">BOT</Badge>}
                      {log.user?.name || log.user?.email || "System/Unknown"}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase opacity-80">{log.user?.customRoles?.map(r => r.name).join(', ') || "SYSTEM IDENT"}</span>
                  </div>
                </TableCell>
                
                <TableCell className="text-xs font-semibold tracking-wider text-purple-400/80">
                  {log.entityType.toUpperCase()}
                </TableCell>
                
                <TableCell>
                  <span className="inline-block px-2 text-[11px] font-mono py-0.5 border border-white/10 bg-black/40 rounded tracking-wider text-white/80">
                      {log.action}
                  </span>
                </TableCell>
                
                <TableCell className="text-xs text-foreground/80 max-w-[200px] truncate" title={String(log.changes || "No Payload")}>
                  {String(log.changes || "No explicit changes tracked.")}
                </TableCell>

                <TableCell className="text-right text-muted-foreground font-mono text-xs opacity-60 pr-6">
                  {log.entityType === 'Incident' || log.entityType === 'Asset' ? (
                     <Link href={log.entityType === 'Incident' ? `/incidents/${log.entityId}` : `/assets/${log.entityId}`} className="hover:text-primary transition-colors hover:underline">
                        ID-{log.entityId.substring(0, 6).toUpperCase()}
                     </Link>
                  ) : (
                    `ID-${log.entityId.substring(0, 6).toUpperCase()}`
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination Overlay Footer */}
        <div className="border-t border-border/50 bg-black/10 p-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
             Results <span className="font-bold text-white/90">{logs.length > 0 ? (page - 1) * TAKE + 1 : 0}</span> — <span className="font-bold text-white/90">{Math.min(page * TAKE, totalCount)}</span> / <span className="text-purple-400">{totalCount}</span> Events
          </p>
          <div className="flex gap-2">
            <Link href={page > 1 ? buildPageUrl(page - 1) : "#"} className={page <= 1 ? "pointer-events-none opacity-50" : ""}>
              <Button variant="outline" size="sm" className="bg-black/30 border-white/10 hover:bg-white/10 text-xs"><ChevronLeft className="w-3 h-3 mr-1" /> Rev</Button>
            </Link>
            <div className="flex items-center justify-center px-4 font-mono text-xs border-x border-border/50 text-white/50">
              SEQ {page} / {totalPages}
            </div>
            <Link href={page < totalPages ? buildPageUrl(page + 1) : "#"} className={page >= totalPages ? "pointer-events-none opacity-50" : ""}>
              <Button variant="outline" size="sm" className="bg-black/30 border-white/10 hover:bg-white/10 text-xs">Fwd <ChevronRight className="w-3 h-3 ml-1" /></Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
