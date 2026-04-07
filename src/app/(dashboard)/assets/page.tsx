import { auth } from "@/auth"
import { hasPermission } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Server, Plus, Filter, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { notFound } from "next/navigation"

export default async function AssetsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const session = await auth()
  if (!session?.user) return null

  // STRICT BOLA ENFORCEMENT
  if (!hasPermission(session as any, 'VIEW_ASSETS')) return notFound()

  const resolvedParams = await searchParams;
  let page = parseInt(resolvedParams.page || "1", 10);
  if (Number.isNaN(page) || page < 1) page = 1;
  
  const TAKE = 10;

  const filterParams: any = {}

  // URL Filters
  if (resolvedParams.status && resolvedParams.status !== "ALL") filterParams.status = resolvedParams.status;
  if (resolvedParams.type && resolvedParams.type !== "ALL") filterParams.type = resolvedParams.type;

  if (resolvedParams.q) {
    filterParams.OR = [
      { name: { contains: resolvedParams.q, mode: "insensitive" } },
      { ipAddress: { contains: resolvedParams.q, mode: "insensitive" } },
      { id: { contains: resolvedParams.q, mode: "insensitive" } }
    ]
  }

  const totalCount = await db.asset.count({ where: filterParams })
  const totalPages = Math.ceil(totalCount / TAKE) || 1

  const assets = await db.asset.findMany({
    where: filterParams,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * TAKE,
    take: TAKE,
  })

  // Function to build safe URL for pagination
  const buildPageUrl = (newPage: number) => {
    const params = new URLSearchParams()
    if (resolvedParams.status) params.set("status", resolvedParams.status)
    if (resolvedParams.type) params.set("type", resolvedParams.type)
    if (resolvedParams.q) params.set("q", resolvedParams.q)
    params.set("page", newPage.toString())
    return `/assets?${params.toString()}`
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <Server className="mr-3 text-blue-400 h-8 w-8" /> Assets Inventory
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Review real-time telemetry and catalog metadata for enterprise systems.</p>
        </div>
        
        <Link href="/assets/new">
          <Button className="bg-primary hover:bg-primary/80 text-primary-foreground shadow-[0_0_10px_rgba(0,255,200,0.3)]">
            <Plus className="w-4 h-4 mr-2" /> Register Asset
          </Button>
        </Link>
      </div>

      <div className="glass-card rounded-xl p-4 flex flex-wrap gap-4 items-center mb-6 border border-border">
        <Filter className="w-5 h-5 text-muted-foreground mr-2" />
        <form method="GET" action="/assets" className="flex flex-1 gap-4 items-end flex-wrap">

          <div className="space-y-1 flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                name="q"
                defaultValue={resolvedParams.q || ""}
                placeholder="Search Name, IP Address, or ID..."
                className="h-9 w-full pl-9 pr-3 rounded-md border border-border/60 bg-black/50 text-sm text-white placeholder:text-muted-foreground focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Status</label>
            <Select key={`status-${resolvedParams.status || 'ALL'}`} name="status" defaultValue={resolvedParams.status || "ALL"}>
              <SelectTrigger className="h-9 w-[150px] px-3 rounded-md border border-border/60 bg-black/50 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none transition-all">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-black/95 border-white/10 shadow-2xl backdrop-blur-md">
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="COMPROMISED" className="text-orange-500 font-bold">Compromised</SelectItem>
                <SelectItem value="MAINTENANCE" className="text-yellow-400">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Type</label>
            <Select key={`type-${resolvedParams.type || 'ALL'}`} name="type" defaultValue={resolvedParams.type || "ALL"}>
              <SelectTrigger className="h-9 w-[150px] px-3 rounded-md border border-border/60 bg-black/50 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none transition-all">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="bg-black/95 border-white/10 shadow-2xl backdrop-blur-md">
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="SERVER">Server</SelectItem>
                <SelectItem value="ENDPOINT">Endpoint</SelectItem>
                <SelectItem value="NETWORK">Network</SelectItem>
                <SelectItem value="SOFTWARE">Software</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" variant="secondary" className="h-9 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 border-dashed">
            Apply Filters
          </Button>

          {(resolvedParams.status || resolvedParams.type || resolvedParams.q) && (
            <Link href="/assets">
              <Button variant="ghost" className="h-9 text-muted-foreground hover:text-white">Clear</Button>
            </Link>
          )}
        </form>
      </div>

      <div className="glass-card rounded-xl overflow-hidden border border-border shadow-2xl">
        <Table className="table-fixed">
          <TableHeader className="bg-black/20">
            <TableRow className="border-border">
              <TableHead className="font-semibold text-primary pl-6 w-[15%]">Asset Key</TableHead>
              <TableHead className="font-semibold text-primary w-[35%]">Name</TableHead>
              <TableHead className="font-semibold text-primary w-[10%]">Type</TableHead>
              <TableHead className="font-semibold text-primary w-[15%]">IP Address</TableHead>
              <TableHead className="font-semibold text-primary w-[10%]">Status</TableHead>
              <TableHead className="font-semibold text-primary text-right pr-6 w-[15%]">Cataloged On</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-40 text-muted-foreground">
                   <span className="block mb-2 text-xl">🔍</span>
                   No assets found matching your criteria.
                </TableCell>
              </TableRow>
            ) : assets.map(asset => (
              <TableRow 
                key={asset.id} 
                className="hover:bg-primary/5 border-border transition-colors cursor-pointer relative group"
              >
                <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap pl-6">
                  <Link href={`/assets/${asset.id}`} className="absolute inset-0" aria-label={`View ${asset.name}`} />
                  Node-{asset.id.substring(0, 6).toUpperCase()}
                </TableCell>
                <TableCell className="font-medium text-foreground">
                  {asset.name}
                </TableCell>
                <TableCell className="text-muted-foreground">{asset.type.replace(/_/g, ' ')}</TableCell>
                <TableCell className="font-mono text-sm text-blue-400">{asset.ipAddress || 'Internal/NAT'}</TableCell>
                <TableCell>
                  <Badge className={`bg-transparent border ${asset.status === 'COMPROMISED' ? 'border-orange-500 text-orange-500 shadow-[0_0_10px_rgba(255,150,0,0.2)] animate-pulse' : (asset.status === 'ACTIVE' ? 'border-primary text-primary' : 'border-muted-foreground text-muted-foreground')}`}>
                    {asset.status.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-muted-foreground font-mono text-xs pr-6">{asset.createdAt.toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        <div className="border-t border-border/50 bg-black/10 p-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-white">{assets.length > 0 ? (page - 1) * TAKE + 1 : 0}</span> to <span className="font-medium text-white">{Math.min(page * TAKE, totalCount)}</span> of <span className="font-medium text-white">{totalCount}</span> assets
          </p>
          <div className="flex gap-2">
            <Link href={page > 1 ? buildPageUrl(page - 1) : "#"} className={page <= 1 ? "pointer-events-none opacity-50" : ""} scroll={false}>
              <Button variant="outline" size="sm" className="bg-black/30 border-white/10 hover:bg-white/10"><ChevronLeft className="w-4 h-4 mr-1" /> Prev</Button>
            </Link>
            <div className="flex items-center justify-center px-4 font-mono text-sm border-x border-border/50">
              Pg {page} / {totalPages}
            </div>
            <Link href={page < totalPages ? buildPageUrl(page + 1) : "#"} className={page >= totalPages ? "pointer-events-none opacity-50" : ""} scroll={false}>
              <Button variant="outline" size="sm" className="bg-black/30 border-white/10 hover:bg-white/10">Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

