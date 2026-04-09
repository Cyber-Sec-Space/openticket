import { auth } from "@/auth"
import { db } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Trash2, Edit3, Server, Network, AlertTriangle, ShieldAlert, Bug } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmForm } from "@/components/ui/confirm-form"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function AssetDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string, incPage?: string, vulnPage?: string }>
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const isEditing = resolvedSearchParams.edit === "true";

  let incPage = parseInt(resolvedSearchParams.incPage as string) || 1;
  if (Number.isNaN(incPage) || incPage < 1) incPage = 1;
  const TAKE_INC = 10;

  let vulnPage = parseInt(resolvedSearchParams.vulnPage as string) || 1;
  if (Number.isNaN(vulnPage) || vulnPage < 1) vulnPage = 1;
  const TAKE_VULN = 10;

  const session = await auth()
  if (!session?.user || !hasPermission(session as any, 'VIEW_ASSETS')) {
    return notFound()
  }

  const [asset, incidents, totalIncidents, vulns, totalVulns] = await Promise.all([
    db.asset.findUnique({ where: { id } }),
    db.incident.findMany({ where: { assetId: id }, orderBy: { createdAt: 'desc' }, take: TAKE_INC, skip: (incPage - 1) * TAKE_INC }),
    db.incident.count({ where: { assetId: id } }),
    db.vulnerability.findMany({ where: { vulnerabilityAssets: { some: { assetId: id } } }, orderBy: { createdAt: 'desc' }, take: TAKE_VULN, skip: (vulnPage - 1) * TAKE_VULN }),
    db.vulnerability.count({ where: { vulnerabilityAssets: { some: { assetId: id } } } })
  ])

  if (!asset) {
    notFound()
  }

  async function updateAssetAction(formData: FormData) {
    "use server"
    const sessionUrl = await auth()
    if (!sessionUrl || !hasPermission(sessionUrl as any, 'UPDATE_ASSETS')) throw new Error("Forbidden")

    const newName = formData.get("name") as string
    const newType = formData.get("type") as any
    const newStatus = formData.get("status") as any
    const newIpAddress = formData.get("ipAddress") as string

    await db.asset.update({
      where: { id: asset!.id },
      data: {
        name: newName,
        type: newType,
        status: newStatus,
        ipAddress: newIpAddress || null
      }
    })

    await db.auditLog.create({
      data: {
        action: "ASSET_MODIFIED",
        entityType: "Asset",
        entityId: asset!.id,
        userId: sessionUrl.user.id,
        changes: `Asset specs revised -> [${newStatus}]`
      }
    })
    redirect(`/assets/${asset!.id}`)
  }

  async function deleteAssetAction() {
    "use server"
    const sessionUrl = await auth()
    if (!sessionUrl || !hasPermission(sessionUrl as any, 'DELETE_ASSETS')) throw new Error("Forbidden")

    // Deleting Asset sets incident.assetId = NULL by Prisma definition.
    await db.asset.deleteMany({ where: { id: asset!.id } })
    redirect(`/assets`)
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <Link href="/assets">
          <Button variant="ghost" className="text-muted-foreground hover:text-white">← Back to Inventory</Button>
        </Link>

        <div className="flex items-center gap-3">
          {hasPermission(session as any, 'UPDATE_ASSETS') && !isEditing && (
            <Link href={`/assets/${asset.id}?edit=true`}>
              <Button variant="outline" size="sm" className="bg-black/20 text-blue-400 border-blue-400/30 hover:bg-blue-400/10">
                <Edit3 className="w-4 h-4 mr-2" /> Modify Specs
              </Button>
            </Link>
          )}

          {hasPermission(session as any, 'DELETE_ASSETS') && (
            <ConfirmForm action={deleteAssetAction} promptMessage="Permanently terminate this node? Associated intelligence tags will be unlinked.">
              <Button type="submit" variant="outline" size="sm" className="bg-black/20 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" /> Decommission Node
              </Button>
            </ConfirmForm>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:justify-between md:items-start border-b border-border/80 pb-6 gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">{asset.name}</h1>
          <p className="text-muted-foreground font-mono text-xs opacity-70 flex items-center gap-2">
            <span className="text-primary"><Network className="inline w-3 h-3 mr-1" /> NODE-{asset.id.substring(0, 8).toUpperCase()}</span>
            • {asset.ipAddress || 'Internal DNS Routing'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-2 md:mt-0">
          <Badge className={`px-3 py-1 bg-transparent border ${asset.status === 'COMPROMISED' ? 'border-destructive text-destructive shadow-[0_0_15px_rgba(255,20,20,0.3)] animate-pulse' : (asset.status === 'ACTIVE' ? 'border-primary text-primary shadow-[0_0_15px_rgba(0,255,200,0.2)]' : 'border-muted-foreground text-muted-foreground')}`}>
            {asset.status.replace(/_/g, ' ')}
          </Badge>
          <Badge variant="outline" className="px-3 py-1 border-white/20 text-white/80 bg-black/20 backdrop-blur-sm">{asset.type.replace(/_/g, ' ')}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card rounded-xl overflow-hidden shadow-2xl relative">
            <CardHeader className="border-b border-border/50 bg-black/10 p-5">
              <CardTitle className="text-primary font-semibold tracking-wide flex items-center gap-2">
                <Server className="w-5 h-5" /> Telemetry Specs
              </CardTitle>
            </CardHeader>
            <div className="p-6">
              {isEditing ? (
                <ConfirmForm action={updateAssetAction} className="space-y-4" promptMessage="Commit definitive modifications to this operational node?">
                  <div className="space-y-2">
                    <Label className="text-primary/70 text-xs uppercase tracking-widest">Node Name</Label>
                    <Input name="name" defaultValue={asset.name} className="bg-black/50 border-white/10" required />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-primary/70 text-xs uppercase tracking-widest">Network Blueprint (IP)</Label>
                    <Input name="ipAddress" defaultValue={asset.ipAddress || ""} className="bg-black/50 border-white/10 font-mono" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-primary/70 text-xs uppercase tracking-widest">Category</Label>
                    <Select key={`asset-type-${asset.type}`} name="type" defaultValue={asset.type}>
                      <SelectTrigger className="flex !h-10 w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black/95 shadow-2xl backdrop-blur-md">
                        <SelectItem value="SERVER">SERVER</SelectItem>
                        <SelectItem value="ENDPOINT">ENDPOINT</SelectItem>
                        <SelectItem value="NETWORK">NETWORK</SelectItem>
                        <SelectItem value="SOFTWARE">SOFTWARE</SelectItem>
                        <SelectItem value="OTHER">OTHER</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-primary/70 text-xs uppercase tracking-widest">Deployment State</Label>
                    <Select key={`asset-status-${asset.status}`} name="status" defaultValue={asset.status}>
                      <SelectTrigger className="flex !h-10 w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black/95 shadow-2xl backdrop-blur-md">
                        <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                        <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                        <SelectItem value="MAINTENANCE" className="text-yellow-400">MAINTENANCE</SelectItem>
                        <SelectItem value="COMPROMISED" className="text-destructive font-bold">COMPROMISED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-3 pt-4 border-t border-border/50">
                    <Button type="submit" className="w-full bg-primary hover:bg-primary/80">Initiate Refactor</Button>
                    <Link href={`/assets/${asset.id}`} className="w-full">
                      <Button variant="ghost" type="button" className="w-full">Abort Edit</Button>
                    </Link>
                  </div>
                </ConfirmForm>
              ) : (
                <div className="space-y-5 text-sm">
                  <div>
                    <strong className="block text-muted-foreground text-[11px] uppercase tracking-wider mb-1">Architecture Record</strong>
                    <span className="text-foreground/90 font-mono text-xs">{asset.createdAt.toLocaleString()}</span>
                  </div>
                  <div>
                    <strong className="block text-muted-foreground text-[11px] uppercase tracking-wider mb-1">Last Transmission Sync</strong>
                    <span className="text-foreground/90 font-mono text-xs">{asset.updatedAt.toLocaleString()}</span>
                  </div>
                  <div>
                    <strong className="block text-muted-foreground text-[11px] uppercase tracking-wider mb-1">Historical Incidents</strong>
                    <span className="text-primary font-mono text-lg font-bold">{totalIncidents}</span>
                    <span className="text-muted-foreground ml-2">events correlated</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-xl overflow-hidden shadow-2xl relative border-t-2 border-t-orange-500/30">
            <CardHeader className="border-b border-border/50 bg-black/10 p-5">
              <CardTitle className="text-orange-400 font-semibold tracking-wide flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" /> Threat Overlay Vector (Incidents)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">Cross-referenced intelligence mapping to this node infrastructure.</CardDescription>
            </CardHeader>
            <div className="p-0">
              <Table>
                <TableHeader className="bg-black/40">
                  <TableRow className="border-border/50">
                    <TableHead className="font-semibold text-primary/70 text-xs px-6 py-4">Threat Intel Key</TableHead>
                    <TableHead className="font-semibold text-primary/70 text-xs">Behavior</TableHead>
                    <TableHead className="font-semibold text-primary/70 text-xs">Risk</TableHead>
                    <TableHead className="font-semibold text-primary/70 text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-32 text-muted-foreground/50 italic">
                        No threat vectors detected. Node is secure.
                      </TableCell>
                    </TableRow>
                  ) : incidents.map(incident => (
                    <TableRow
                      key={incident.id}
                      className="cursor-pointer border-border/50 hover:bg-orange-500/5 transition-colors relative group"
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground px-6">
                        <Link href={`/incidents/${incident.id}`} className="absolute inset-0" />
                        INC-{incident.id.substring(0, 6).toUpperCase()}
                      </TableCell>
                      <TableCell className="font-medium text-foreground/90 text-sm">
                        {incident.title}
                      </TableCell>
                      <TableCell>
                        <Badge className={`bg-transparent border text-[10px] ${incident.severity === 'CRITICAL' ? 'border-destructive text-destructive' : 'border-primary/50 text-primary/80'}`}>
                          {incident.severity.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground bg-black/30 text-[10px]">
                          {incident.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalIncidents > TAKE_INC && (
                <div className="flex justify-between items-center p-4 border-t border-border/50 bg-black/20">
                  {incPage <= 1 ? (
                    <Button variant="ghost" size="sm" disabled className="h-8 text-xs disabled:opacity-30">← Previous</Button>
                  ) : (
                    <Link href={`/assets/${asset.id}?incPage=${incPage - 1}&vulnPage=${vulnPage}`} scroll={false}>
                      <Button variant="ghost" size="sm" className="h-8 text-xs">← Previous</Button>
                    </Link>
                  )}
                  <span className="text-xs font-mono text-muted-foreground">Page {incPage} of {Math.ceil(totalIncidents / TAKE_INC)}</span>
                  {incPage >= Math.ceil(totalIncidents / TAKE_INC) ? (
                    <Button variant="ghost" size="sm" disabled className="h-8 text-xs disabled:opacity-30">Next →</Button>
                  ) : (
                    <Link href={`/assets/${asset.id}?incPage=${incPage + 1}&vulnPage=${vulnPage}`} scroll={false}>
                      <Button variant="ghost" size="sm" className="h-8 text-xs">Next →</Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="glass-card rounded-xl overflow-hidden shadow-2xl relative border-t-2 border-t-red-500/30">
            <CardHeader className="border-b border-border/50 bg-black/10 p-5">
              <CardTitle className="text-red-400 font-semibold tracking-wide flex items-center">
                <ShieldAlert className="w-5 h-5 mr-2" /> Correlated Vulnerabilities
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">Known system vulnerabilities affecting this specific node.</CardDescription>
            </CardHeader>
            <div className="p-0">
              <Table>
                <TableHeader className="bg-black/40">
                  <TableRow className="border-border/50">
                    <TableHead className="font-semibold text-primary/70 text-xs px-6 py-4">CVE / Tracking</TableHead>
                    <TableHead className="font-semibold text-primary/70 text-xs">Title</TableHead>
                    <TableHead className="font-semibold text-primary/70 text-xs text-center">Score</TableHead>
                    <TableHead className="font-semibold text-primary/70 text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vulns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-32 text-muted-foreground/50 italic">
                        No architectural vulnerabilities found for this asset.
                      </TableCell>
                    </TableRow>
                  ) : vulns.map(vuln => (
                    <TableRow
                      key={vuln.id}
                      className="cursor-pointer border-border/50 hover:bg-red-500/5 transition-colors relative group"
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground px-6">
                        <Link href={`/vulnerabilities/${vuln.id}`} className="absolute inset-0" />
                        {vuln.cveId ? (
                          <span className="flex items-center"><Bug className="w-3 h-3 mr-1" />{vuln.cveId}</span>
                        ) : (
                          `VULN-${vuln.id.substring(0, 6).toUpperCase()}`
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-foreground/90 text-sm">
                        {vuln.title}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`bg-transparent border text-[10px] ${vuln.severity === 'CRITICAL' ? 'border-destructive text-destructive' : 'border-primary/50 text-primary/80'}`}>
                          {vuln.cvssScore ? vuln.cvssScore.toFixed(1) : vuln.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground bg-black/30 text-[10px]">
                          {vuln.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalVulns > TAKE_VULN && (
                <div className="flex justify-between items-center p-4 border-t border-border/50 bg-black/20">
                  {vulnPage <= 1 ? (
                    <Button variant="ghost" size="sm" disabled className="h-8 text-xs disabled:opacity-30">← Previous</Button>
                  ) : (
                    <Link href={`/assets/${asset.id}?incPage=${incPage}&vulnPage=${vulnPage - 1}`} scroll={false}>
                      <Button variant="ghost" size="sm" className="h-8 text-xs">← Previous</Button>
                    </Link>
                  )}
                  <span className="text-xs font-mono text-muted-foreground">Page {vulnPage} of {Math.ceil(totalVulns / TAKE_VULN)}</span>
                  {vulnPage >= Math.ceil(totalVulns / TAKE_VULN) ? (
                    <Button variant="ghost" size="sm" disabled className="h-8 text-xs disabled:opacity-30">Next →</Button>
                  ) : (
                    <Link href={`/assets/${asset.id}?incPage=${incPage}&vulnPage=${vulnPage + 1}`} scroll={false}>
                      <Button variant="ghost" size="sm" className="h-8 text-xs">Next →</Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
