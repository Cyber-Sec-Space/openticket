import { auth } from "@/auth"
import { db } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Edit3, ShieldAlert, Activity } from "lucide-react"

export default async function IncidentDetailPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }> 
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const isEditing = edit === "true";

  const session = await auth()
  if (!session?.user) return null

  const incident = await db.incident.findUnique({
    where: { id },
    include: {
      reporter: true,
      assignee: true,
      asset: true,
      comments: {
        include: { author: true },
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  // Fetch loosely coupled AuditLogs
  const auditLogs = await db.auditLog.findMany({
    where: { entityType: 'Incident', entityId: id },
    include: { user: true },
    orderBy: { createdAt: 'desc' }
  })

  if (!incident || (session.user.role === 'REPORTER' && incident.reporterId !== session.user.id)) {
    notFound()
  }

  // Construct Unified Timeline
  const timeline: any[] = [
    ...incident.comments.map(c => ({ ...c, type: 'COMMENT' })),
    ...auditLogs.map(l => ({ ...l, type: 'AUDIT', author: l.user, content: `${l.action} -> ${l.changes}` }))
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  // Only SECOPS/ADMIN can assign tickets.
  let eligibleAssignees: any[] = []
  if (session.user.role !== 'REPORTER') {
    eligibleAssignees = await db.user.findMany({
      where: { role: { in: ['ADMIN', 'SECOPS'] } },
      select: { id: true, name: true, role: true }
    })
  }

  async function updateIncidentAction(formData: FormData) {
    "use server"
    const sessionUrl = await auth()
    if (!sessionUrl || sessionUrl.user.role === 'REPORTER') throw new Error("Forbidden")
    
    const newStatus = formData.get("status") as any
    const newSeverity = formData.get("severity") as any
    let newAssigneeId: string | null = formData.get("assigneeId") as string
    if (!newAssigneeId || newAssigneeId === "UNASSIGNED") newAssigneeId = null;

    const changesText = `Status: ${newStatus}, Severity: ${newSeverity}, Assignee: ${newAssigneeId || 'Unassigned'}`

    await db.incident.update({
      where: { id: incident!.id },
      data: { status: newStatus, severity: newSeverity, assigneeId: newAssigneeId }
    })
    
    await db.auditLog.create({
      data: {
        action: "TRIAGE_POLICY_CHANGED",
        entityType: "Incident",
        entityId: incident!.id,
        userId: sessionUrl.user.id,
        changes: changesText
      }
    })
    redirect(`/incidents/${incident!.id}`)
  }

  async function editDetailsAction(formData: FormData) {
    "use server"
    const sessionUrl = await auth()
    if (!sessionUrl || sessionUrl.user.role === 'REPORTER') throw new Error("Forbidden")
    
    const newTitle = formData.get("title") as string
    const newType = formData.get("type") as string
    const newDesc = formData.get("description") as string

    await db.incident.update({
      where: { id: incident!.id },
      data: { title: newTitle, type: newType as any, description: newDesc }
    })
    
    await db.auditLog.create({
      data: {
        action: "DETAILS_EDITED",
        entityType: "Incident",
        entityId: incident!.id,
        userId: sessionUrl.user.id,
        changes: `Title / Category / Description updated by SecOps`
      }
    })
    redirect(`/incidents/${incident!.id}`)
  }

  async function deleteIncidentAction() {
    "use server"
    const sessionUrl = await auth()
    if (!sessionUrl || sessionUrl.user.role !== 'ADMIN') throw new Error("Forbidden")
    
    // Prisma cascading handles Comment/AuditLog deletions seamlessly
    await db.incident.delete({ where: { id: incident!.id } })
    redirect(`/incidents`)
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center mb-2">
        <Link href="/incidents">
          <Button variant="ghost" className="text-muted-foreground hover:text-white">← Back to Incidents</Button>
        </Link>

        <div className="flex items-center gap-3">
          {session.user.role !== 'REPORTER' && !isEditing && (
             <Link href={`/incidents/${incident.id}?edit=true`}>
               <Button variant="outline" size="sm" className="bg-black/20 text-blue-400 border-blue-400/30 hover:bg-blue-400/10">
                 <Edit3 className="w-4 h-4 mr-2" /> Edit Details
               </Button>
             </Link>
          )}

          {session.user.role === 'ADMIN' && (
             <form action={deleteIncidentAction}>
                <Button type="submit" variant="outline" size="sm" className="bg-black/20 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Terminate Ticket
                </Button>
             </form>
          )}
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row md:justify-between md:items-start border-b border-border/80 pb-6 gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">{incident.title}</h1>
          <p className="text-muted-foreground font-mono text-xs opacity-70 flex items-center gap-2">
            <span className="text-primary"><ShieldAlert className="inline w-3 h-3" /> TKT-{incident.id.substring(0,8).toUpperCase()}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-2 md:mt-0">
          <Badge className={`px-3 py-1 bg-transparent border ${incident.severity === 'CRITICAL' ? 'border-destructive text-destructive shadow-[0_0_15px_rgba(255,20,20,0.3)] animate-pulse' : 'border-primary text-primary'}`}>
            {incident.severity}
          </Badge>
          <Badge variant="outline" className="px-3 py-1 border-white/20 text-white/80 bg-black/20 backdrop-blur-sm">{incident.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-xl overflow-hidden shadow-2xl relative">
            <CardHeader className="border-b border-border/50 bg-black/10">
              <CardTitle className="text-primary font-semibold tracking-wide flex items-center gap-2">
                Incident Intelligence
              </CardTitle>
            </CardHeader>
            <div className="p-6">
              {isEditing ? (
                <form action={editDetailsAction} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-primary/70 text-xs uppercase tracking-widest">Incident Definition</Label>
                    <Input name="title" defaultValue={incident.title} className="bg-black/50 border-white/10" required />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-primary/70 text-xs uppercase tracking-widest">Category</Label>
                    <div className="relative">
                      <select 
                        name="type" 
                        defaultValue={incident.type}
                        className="flex h-10 w-full appearance-none rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all pr-8"
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
                    <Label className="text-primary/70 text-xs uppercase tracking-widest">Tactical Overview</Label>
                    <Textarea name="description" rows={8} defaultValue={incident.description} className="bg-black/50 border-white/10 resize-none text-sm font-mono leading-relaxed" required />
                  </div>
                  <div className="flex gap-3 pt-2 mt-4">
                    <Button type="submit" className="bg-primary hover:bg-primary/80">Save Modifications</Button>
                    <Link href={`/incidents/${incident.id}`}>
                       <Button variant="ghost" type="button">Cancel</Button>
                    </Link>
                  </div>
                </form>
              ) : (
                <div className="space-y-8">
                  <div>
                    <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-pulse"></span>
                      Incident Definition
                    </h4>
                    <p className="text-lg font-semibold text-white/90">{incident.title}</p>
                  </div>

                  <div>
                     <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/70"></span>
                      Category Alignment
                    </h4>
                    <Badge variant="outline" className="border-primary/40 text-primary/80 bg-primary/5 tracking-wider px-3">
                      {incident.type.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div>
                     <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/70"></span>
                      Tactical Overview
                    </h4>
                    <div className="p-4 rounded-lg border border-white/5 bg-black/20">
                      <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/80 leading-loose">
                        {incident.description}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card rounded-xl overflow-hidden shadow-2xl relative border-t-2 border-t-blue-500/30">
            <CardHeader className="border-b border-border/50 bg-black/10">
              <CardTitle className="text-blue-400 font-semibold tracking-wide flex items-center">
                <Activity className="w-5 h-5 mr-2" /> Unified Defense Timeline
              </CardTitle>
            </CardHeader>
            <div className="p-6 space-y-4">
              <form action={async (formData) => {
                "use server"
                const sessionUrl = await auth()
                const content = formData.get("content") as string
                if (!content || !sessionUrl) return;
                await db.comment.create({
                  data: { content, incidentId: incident!.id, authorId: sessionUrl.user.id }
                })
                redirect(`/incidents/${incident!.id}`)
              }} className="space-y-3 pb-6 border-b border-border/50">
                <textarea 
                  name="content" 
                  rows={3} 
                  required
                  placeholder="Record investigation notes or attach intel..." 
                  className="w-full text-sm rounded-lg border border-border/60 bg-black/30 p-3 text-white placeholder:text-muted-foreground focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none"
                />
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(0,100,255,0.3)]">Post Investigation Log</Button>
              </form>

              <div className="space-y-4 pt-2">
                {timeline.map((item, idx) => (
                  <div key={idx} className={`p-4 rounded-lg border transition-colors ${item.type === 'AUDIT' ? 'border-primary/20 bg-primary/5' : 'border-border/50 bg-black/20 hover:border-blue-400/30'}`}>
                    <div className="flex justify-between items-center text-xs text-muted-foreground mb-3">
                      <span className={`font-semibold ${item.type === 'AUDIT' ? 'text-primary' : 'text-white/90'}`}>
                        {item.author?.name || 'System'} 
                        <span className="opacity-50 text-[10px] font-normal ml-1">({item.type === 'AUDIT' ? 'SYSTEM EVENT' : item.author?.role})</span>
                      </span>
                      <span className="font-mono text-[10px] opacity-70">{item.createdAt.toLocaleString()}</span>
                    </div>
                    {item.type === 'AUDIT' ? (
                       <p className="text-xs font-mono text-primary/70 bg-black/40 p-2 rounded block">{item.content}</p>
                    ) : (
                       <p className="text-sm text-foreground/80 leading-relaxed">{item.content}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card rounded-xl overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-border/50 bg-black/10">
              <CardTitle className="text-white/90 text-sm font-semibold tracking-wide">Identity Context</CardTitle>
            </CardHeader>
            <div className="p-6 space-y-5 text-sm">
              <div>
                <strong className="block text-muted-foreground text-[11px] uppercase tracking-wider mb-1">Reporter</strong>
                <span className="text-foreground/90 font-medium">{incident.reporter.name}</span>
              </div>
              <div>
                <strong className="block text-muted-foreground text-[11px] uppercase tracking-wider mb-1">Target Asset</strong>
                {incident.asset ? (
                  <Link href={`/assets/${incident.asset.id}`} className="text-primary hover:underline font-mono text-xs">
                    {incident.asset.name}
                  </Link>
                ) : <span className="text-muted-foreground italic text-xs">None Linked</span>}
              </div>
              <div>
                <strong className="block text-muted-foreground text-[11px] uppercase tracking-wider mb-1">Record Initialized</strong>
                <span className="font-mono text-xs text-foreground/80">{incident.createdAt.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {session.user.role !== 'REPORTER' && !isEditing && (
            <div className="glass-card rounded-xl overflow-hidden shadow-2xl border border-primary/30">
              <CardHeader className="border-b border-border/50 bg-primary/10">
                <CardTitle className="text-primary text-sm font-semibold tracking-wide">Execution Policy & Triage</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Adjust operational state and assignees</CardDescription>
              </CardHeader>
              <div className="p-6">
                <form action={updateIncidentAction} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs text-white/70">Assignee</Label>
                    <select name="assigneeId" defaultValue={incident.assigneeId || "UNASSIGNED"} className="w-full rounded-md border border-border/60 bg-black/50 p-2.5 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none transition-all">
                      <option value="UNASSIGNED" className="text-muted-foreground italic">Unassigned</option>
                      {eligibleAssignees.map(u => (
                        <option key={u.id} value={u.id}>{u.name} [{u.role}]</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs text-white/70">Severity</Label>
                    <select name="severity" defaultValue={incident.severity} className="w-full rounded-md border border-border/60 bg-black/50 p-2.5 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none transition-all">
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-white/70">Status</Label>
                    <select name="status" defaultValue={incident.status} className="w-full rounded-md border border-border/60 bg-black/50 p-2.5 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none transition-all">
                      <option value="NEW">NEW</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="PENDING_INFO">PENDING_INFO</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </div>

                  <Button type="submit" className="w-full font-semibold bg-primary hover:bg-primary/80 shadow-[0_0_15px_rgba(0,255,200,0.2)] mt-2">
                    Commit Changes
                  </Button>
                </form>
              </div>
            </div>
          )}

          {session.user.role === 'REPORTER' && (
             <div className="glass-card rounded-xl p-6 shadow-2xl">
                 <strong className="block text-muted-foreground text-[11px] uppercase tracking-wider mb-1">Assigned Handler</strong>
                  <span className={incident.assignee ? "text-foreground/90 font-medium text-sm" : "text-muted-foreground italic text-sm"}>
                    {incident.assignee ? incident.assignee.name : "Waiting for Triage"}
                  </span>
             </div>
          )}
        </div>
      </div>
    </div>
  )
}
