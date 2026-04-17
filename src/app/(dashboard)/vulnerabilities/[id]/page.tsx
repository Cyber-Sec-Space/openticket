import { auth } from "@/auth"
import { hasPermission } from "@/lib/auth-utils"
import { notFound, redirect } from "next/navigation"
import { db } from "@/lib/db"
import { uploadAttachment, deleteAttachment } from "@/app/actions/upload"
import { FileUploadBox } from "@/components/file-upload-box"
import { Bug, ShieldAlert, Server, Trash2, ShieldCheck, Activity, Calendar, Paperclip, Upload } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { MultiAssigneePicker } from "@/components/ui/multi-assignee-picker"
import { MultiAssetPicker } from "@/components/ui/multi-asset-picker"
import { updateVulnAssetStatusAction, deleteVulnerabilityAction, addAssigneesAction, removeAssigneeAction, postVulnCommentAction, linkVulnAssetAction, unlinkVulnAssetAction, setVulnAssigneesAction } from "./actions"
import Link from "next/link"
import { Users, MessageSquare } from "lucide-react"
import { PluginEngineContextRenderer } from "@/components/plugins/plugin-context-renderer"

interface MatchProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ assetPage?: string, filePage?: string }>
}

export default async function VulnerabilityDetailPage({ params, searchParams }: MatchProps) {
  const { id } = await params
  const resolvedSearchParams = await searchParams;
  const session = await auth()

  if (!session?.user || !hasPermission(session as any, 'VIEW_VULNERABILITIES')) {
    redirect("/login")
  }

  let assetPage = parseInt(resolvedSearchParams.assetPage as string) || 1;
  if (Number.isNaN(assetPage) || assetPage < 1) assetPage = 1;

  let filePage = parseInt(resolvedSearchParams.filePage as string) || 1;
  if (Number.isNaN(filePage) || filePage < 1) filePage = 1;

  const TAKE_ASSET = 10;
  const TAKE_FILE = 8;

  const [vuln, affectedAssets, totalAssets, attachments, totalAttachments, allAssets, allUsers] = await Promise.all([
    db.vulnerability.findUnique({
      where: { id },
      include: {
        assignees: true,
        comments: {
          include: { author: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    }),
    db.vulnerabilityAsset.findMany({
      where: { vulnId: id },
      include: { asset: true },
      take: TAKE_ASSET,
      skip: (assetPage - 1) * TAKE_ASSET
    }),
    db.vulnerabilityAsset.count({ where: { vulnId: id } }),
    db.attachment.findMany({ where: { vulnId: id }, orderBy: { createdAt: 'desc' }, take: TAKE_FILE, skip: (filePage - 1) * TAKE_FILE }),
    db.attachment.count({ where: { vulnId: id } }),
    db.asset.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, type: true } }),
    db.user.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, isBot: true } })
  ])

  if (!vuln) {
    return notFound()
  }

  const cvssColor =
    vuln.cvssScore && vuln.cvssScore >= 9.0 ? 'text-red-500' :
      vuln.cvssScore && vuln.cvssScore >= 7.0 ? 'text-orange-500' :
        vuln.cvssScore && vuln.cvssScore >= 4.0 ? 'text-yellow-400' :
          'text-blue-400';

  return (
    <div className="p-8 w-full max-w-[1600px] mx-auto space-y-8 animate-fade-in-up">
      <header className="flex flex-col md:flex-row justify-between items-start gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <Badge variant="outline" className={`font-mono bg-black/50 ${cvssColor} border-${cvssColor.replace('text-', '')}/30`}>
              CVSS: {vuln.cvssScore !== null ? vuln.cvssScore.toFixed(1) : 'N/A'}
            </Badge>
            <Badge variant={vuln.severity === 'CRITICAL' ? 'destructive' : 'secondary'} className={`font-mono bg-black/50 ${vuln.severity === 'INFO' ? 'text-cyan-400 border-cyan-500/30' : ''}`}>
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
          {hasPermission(session as any, 'UPDATE_VULNERABILITIES') && (
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

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-4">
              {vuln.targetSlaDate ? (
                <span className={`font-mono text-xs font-semibold px-2 py-1 rounded ${new Date() > vuln.targetSlaDate ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                  <Calendar className="w-3 h-3 inline mr-2" />
                  Target SLA: {vuln.targetSlaDate.toLocaleString()}
                </span>
              ) : (
                <span className="text-muted-foreground italic text-xs"><Calendar className="w-3 h-3 inline mr-1" /> No Remediation SLA enforced</span>
              )}
              <p className="text-xs text-muted-foreground/30 text-right">
                Discovered: {new Date(vuln.createdAt).toLocaleString()}
              </p>
            </div>
          </div>



          <div className="glass-card rounded-xl p-6 border border-border mt-8 shadow-2xl">
            <h2 className="text-lg font-bold tracking-tight mb-4 flex items-center text-primary/80">
              <Activity className="w-5 h-5 mr-3 text-purple-400" /> Operational Posture
            </h2>
            <div className="flex flex-col space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-xs text-white/70 uppercase tracking-widest">Enforce SLA Date</label>
                  <DateTimePicker
                    name="targetSlaDate"
                    defaultValue={vuln.targetSlaDate}
                    className="max-w-full"
                    disabled
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-xs text-white/70 uppercase tracking-widest">Computed State</label>
                  <div className="h-10 w-full bg-black/50 border border-white/10 rounded-md flex items-center px-3 font-mono text-sm text-muted-foreground cursor-not-allowed">
                    {vuln.status} (Derived via Assets)
                  </div>
                </div>
              </div>
            </div>
          </div>


          <PluginEngineContextRenderer hookType="vulnerabilityMainWidgets" payload={{ vulnerability: vuln }} />

          <div className="glass-card rounded-xl p-6 border border-border mt-8 shadow-2xl relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none" />
            <h2 className="text-lg font-bold tracking-tight mb-6 flex items-center text-primary/80">
              <MessageSquare className="w-5 h-5 mr-3" /> Communication Wall
            </h2>
            <div className="space-y-4 mb-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {vuln.comments.length === 0 ? (
                <p className="text-muted-foreground text-sm italic text-center py-8">No communication logs recorded.</p>
              ) : (
                vuln.comments.map((comment: any) => (
                  <div key={comment.id} className="bg-black/40 rounded-lg p-4 border border-white/5 flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold text-xs">{comment.author?.name?.charAt(0) || '?'}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-white/90">{comment.author?.name || 'Unknown User'}</span>
                        <span className="text-xs text-muted-foreground font-mono">{comment.createdAt.toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-white/80 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {hasPermission(session as any, 'VIEW_VULNERABILITIES') && (
              <form action={postVulnCommentAction} className="mt-4 flex flex-col space-y-2">
                <input type="hidden" name="vulnId" value={vuln.id} />
                <textarea
                  name="content"
                  rows={3}
                  required
                  placeholder="Record investigation notes or attach intel..."
                  className="w-full text-sm rounded-lg border border-border/60 bg-black/30 p-3 text-white placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all resize-none"
                />
                <Button type="submit" size="sm" variant="secondary" className="shadow-[0_0_15px_rgba(255,255,255,0.1)] font-semibold">
                  Post Investigation Log
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column - Dashboards & Metadata */}
        <div className="space-y-6">
          
          <div className="glass-card rounded-xl border border-border shadow-2xl flex flex-col">
            <div className="w-full text-left p-5 border-b border-white/5 flex items-center bg-black/20">
              <Users className="w-5 h-5 mr-3 text-cyan-400" />
              <h2 className="font-bold tracking-tight text-cyan-500 flex-1">Triage Assignees</h2>
            </div>
            
            <div className="p-4 space-y-4 shadow-inner bg-black/20">
              <form action={setVulnAssigneesAction} className="flex flex-col gap-3">
                <input type="hidden" name="vulnId" value={vuln.id} />
                <div className="space-y-1.5">
                   <label className="text-[11px] uppercase tracking-widest text-cyan-500/70 font-semibold">Authorized Personnel</label>
                   <MultiAssigneePicker
                      users={allUsers}
                      defaultSelectedIds={vuln.assignees.map((a: any) => a.id)}
                   />
                </div>
                {(hasPermission(session as any, 'ASSIGN_VULNERABILITIES_SELF') || hasPermission(session as any, 'ASSIGN_VULNERABILITIES_OTHERS')) && (
                  <Button type="submit" size="sm" className="w-full h-9 bg-cyan-950/40 text-cyan-400 hover:bg-cyan-900/60 border border-cyan-900/50 text-[11px] font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                    Update Assignees
                  </Button>
                )}
              </form>
            </div>
          </div>

          <div className="glass-card rounded-xl border border-border shadow-2xl flex flex-col items-center">
            <div className="w-full text-left p-6 border-b border-white/5 flex items-center bg-black/20">
              <Server className="w-5 h-5 mr-3 text-red-400" />
              <h2 className="font-bold tracking-tight text-red-500 flex-1">Infected Infrastructure</h2>
            </div>

            {hasPermission(session as any, 'UPDATE_VULNERABILITIES') && (
              <form action={linkVulnAssetAction} className="w-full p-4 border-b border-white/5 bg-black/40 flex flex-col gap-3">
                <input type="hidden" name="vulnId" value={vuln.id} />
                <div className="w-full relative z-20">
                  <MultiAssetPicker assets={allAssets as any} />
                </div>
                <Button type="submit" size="sm" variant="secondary" className="w-full h-8 text-xs shrink-0 bg-red-950/40 text-red-400 hover:bg-red-900/60 border border-red-900/50">Link Selected Assets</Button>
              </form>
            )}

            <div className="w-full p-4 space-y-3 flex-1 flex flex-col justify-between">
              {totalAssets === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 opacity-50 space-y-2">
                  <ShieldCheck className="w-8 h-8 text-green-500" />
                  <p className="text-muted-foreground text-sm font-mono text-center">Zero Assets Currently Mapping to this Vulnerability Vector.</p>
                </div>
              ) : (
                <>
                  <ul className="space-y-2">
                    {affectedAssets.map((vulnAsset: any) => (
                      <li key={vulnAsset.id} className="bg-black/40 border border-red-500/20 rounded-lg p-3 hover:bg-black/60 transition-colors flex flex-col gap-3 group">
                        <Link href={`/assets/${vulnAsset.asset.id}`} className="flex justify-between items-start">
                          <div>
                            <p className="font-bold font-mono text-sm text-red-400 group-hover:text-red-300 transition-colors">{vulnAsset.asset.name}</p>
                            <span className="text-[10px] text-muted-foreground uppercase">{vulnAsset.asset.type.replace(/_/g, ' ')} • {vulnAsset.asset.status.replace(/_/g, ' ')}</span>
                          </div>
                          {vulnAsset.asset.ipAddress && <span className="text-xs bg-red-950/50 text-red-300 px-2 py-1 flex items-center rounded border border-red-900/50 font-mono tracking-tighter">{vulnAsset.asset.ipAddress}</span>}
                        </Link>

                        <div className="flex gap-2 items-center justify-between border-t border-white/5 pt-2">
                          {hasPermission(session as any, 'UPDATE_VULNERABILITIES') ? (
                            <form action={updateVulnAssetStatusAction} className="flex gap-2">
                              <input type="hidden" name="vulnAssetId" value={vulnAsset.id} />
                              <input type="hidden" name="vulnId" value={vuln.id} />
                              <Select key={`vulnAsset-status-${vulnAsset.id}-${vulnAsset.status}`} name="status" defaultValue={vulnAsset.status}>
                                <SelectTrigger className="w-[140px] bg-black/50 border-white/10 !h-7 text-[10px] rounded">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-black/95 border-white/10">
                                  <SelectItem value="AFFECTED" className="text-[11px] text-red-400">AFFECTED</SelectItem>
                                  <SelectItem value="MITIGATED" className="text-[11px] text-yellow-500">MITIGATED</SelectItem>
                                  <SelectItem value="PATCHED" className="text-[11px] text-green-500">PATCHED</SelectItem>
                                  <SelectItem value="FALSE_POSITIVE" className="text-[11px] text-blue-400">FALSE POSITIVE</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button type="submit" size="sm" variant="outline" className="h-7 text-[10px] bg-black/40 hover:bg-black/80 text-muted-foreground">Save</Button>
                            </form>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-mono">{vulnAsset.status}</Badge>
                          )}

                          {hasPermission(session as any, 'DELETE_VULNERABILITIES') && (
                            <form action={unlinkVulnAssetAction}>
                              <input type="hidden" name="vulnId" value={vuln.id} />
                              <input type="hidden" name="vulnAssetId" value={vulnAsset.id} />
                              <button type="submit" className="p-1.5 hover:bg-red-500/20 text-red-400/50 hover:text-red-400 rounded transition-colors" title="Unlink Asset">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </form>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {totalAssets > TAKE_ASSET && (
                    <div className="flex justify-between items-center pt-2 mt-auto border-t border-white/5">
                      {assetPage <= 1 ? (
                        <Button variant="ghost" size="sm" disabled className="h-6 text-[10px] disabled:opacity-30 p-0 hover:bg-transparent">← Prev</Button>
                      ) : (
                        <Link href={`/vulnerabilities/${vuln.id}?assetPage=${assetPage - 1}&filePage=${filePage}`} scroll={false}>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] p-0 hover:bg-transparent text-primary">← Prev</Button>
                        </Link>
                      )}
                      <span className="text-[10px] font-mono text-muted-foreground">Pg {assetPage}/{Math.ceil(totalAssets / TAKE_ASSET)}</span>
                      {assetPage >= Math.ceil(totalAssets / TAKE_ASSET) ? (
                        <Button variant="ghost" size="sm" disabled className="h-6 text-[10px] disabled:opacity-30 p-0 hover:bg-transparent">Next →</Button>
                      ) : (
                        <Link href={`/vulnerabilities/${vuln.id}?assetPage=${assetPage + 1}&filePage=${filePage}`} scroll={false}>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] p-0 hover:bg-transparent text-primary">Next →</Button>
                        </Link>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="glass-card rounded-xl overflow-hidden shadow-2xl relative border-t-2 border-t-indigo-500/30">
            <div className="border-b border-border/50 bg-black/10 p-5">
              <h2 className="font-bold tracking-tight text-indigo-400 text-sm flex items-center">
                <Paperclip className="w-4 h-4 mr-2" /> Digital Evidence
              </h2>
            </div>
            <div className="p-5 space-y-4 text-sm z-20">
              <form action={async (formData) => {
                "use server"
                formData.append("vulnId", vuln!.id)
                await uploadAttachment(formData)
              }} className="space-y-3 pb-5 border-b border-border/50">
                <FileUploadBox />
                <Button type="submit" size="sm" className="w-full bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_15px_rgba(100,0,255,0.2)]">
                  Attach Evidence
                </Button>
              </form>

              {attachments.length > 0 ? (
                <div className="flex flex-col gap-2 pt-1">
                  {attachments.map((att: any) => (
                    <div key={att.id} className="relative flex items-center p-2 rounded-lg border border-indigo-500/10 bg-indigo-500/5 hover:border-indigo-400/40 transition-colors group">
                      <a href={att.fileUrl} target="_blank" rel="noreferrer" className="flex flex-1 min-w-0 items-center">
                        <Paperclip className="w-3 h-3 mr-2 text-indigo-400/70 group-hover:text-indigo-400 flex-shrink-0" />
                        <div className="flex flex-col min-w-0 pr-1">
                          <span className="text-[11px] font-medium text-white/90 truncate">{att.filename}</span>
                          <span className="text-[9px] font-mono text-muted-foreground">{att.createdAt.toLocaleDateString()}</span>
                        </div>
                      </a>
                      <form action={async () => {
                        "use server"
                        await deleteAttachment(att.id)
                      }}>
                        <button type="submit" className="p-1.5 rounded-md hover:bg-red-500/20 text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all absolute right-2 top-1/2 -translate-y-1/2" title="Delete evidence">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>
                  ))}

                  {totalAttachments > TAKE_FILE && (
                    <div className="flex justify-between items-center pt-3 mt-1 border-t border-white/5">
                      {filePage <= 1 ? (
                        <Button variant="ghost" size="sm" disabled className="h-6 text-[10px] disabled:opacity-30 p-0 hover:bg-transparent">← Prev</Button>
                      ) : (
                        <Link href={`/vulnerabilities/${vuln.id}?assetPage=${assetPage}&filePage=${filePage - 1}`} scroll={false}>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] p-0 hover:bg-transparent text-primary">← Prev</Button>
                        </Link>
                      )}
                      <span className="text-[10px] font-mono text-muted-foreground">Pg {filePage}/{Math.ceil(totalAttachments / TAKE_FILE)}</span>
                      {filePage >= Math.ceil(totalAttachments / TAKE_FILE) ? (
                        <Button variant="ghost" size="sm" disabled className="h-6 text-[10px] disabled:opacity-30 p-0 hover:bg-transparent">Next →</Button>
                      ) : (
                        <Link href={`/vulnerabilities/${vuln.id}?assetPage=${assetPage}&filePage=${filePage + 1}`} scroll={false}>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] p-0 hover:bg-transparent text-primary">Next →</Button>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-[10px] text-muted-foreground/50 py-2 italic font-mono uppercase tracking-widest">No evidence uploaded</p>
              )}
            </div>
          </div>

          <PluginEngineContextRenderer hookType="vulnerabilitySidebarWidgets" payload={{ vulnerability: vuln }} />
        </div>
      </div>
    </div>
  )
}
