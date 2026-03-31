import { auth } from "@/auth"
import { db } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  if (!incident || (session.user.role === 'REPORTER' && incident.reporterId !== session.user.id)) {
    notFound()
  }

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
      data: { 
        status: newStatus,
        severity: newSeverity,
        assigneeId: newAssigneeId
      }
    })
    
    await db.auditLog.create({
      data: {
        action: "INCIDENT_UPDATED",
        entityType: "Incident",
        entityId: incident!.id,
        userId: sessionUrl.user.id,
        changes: changesText
      }
    })
    redirect(`/incidents/${incident?.id}`)
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 animate-fade-in-up">
      <Link href="/incidents">
        <Button variant="ghost" className="text-muted-foreground hover:text-white mb-2">← Back to Incidents</Button>
      </Link>
      
      <div className="flex justify-between items-start border-b border-border/80 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">{incident.title}</h1>
          <p className="text-muted-foreground font-mono text-xs opacity-70">TKT-{incident.id.substring(0,8).toUpperCase()}</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className={`px-3 py-1 bg-transparent border ${incident.severity === 'CRITICAL' ? 'border-destructive text-destructive shadow-[0_0_15px_rgba(255,20,20,0.3)] animate-pulse' : 'border-primary text-primary'}`}>
            {incident.severity}
          </Badge>
          <Badge variant="outline" className="px-3 py-1 border-white/20 text-white/80 bg-black/20 backdrop-blur-sm">{incident.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-xl overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-border/50 bg-black/10">
              <CardTitle className="text-primary font-semibold tracking-wide flex items-center gap-2">
                Incident Description
              </CardTitle>
            </CardHeader>
            <div className="p-6">
              <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90 leading-relaxed">
                {incident.description}
              </pre>
            </div>
          </div>

          <div className="glass-card rounded-xl overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-border/50 bg-black/10">
              <CardTitle className="text-blue-400 font-semibold tracking-wide">Action Logs & Discussion</CardTitle>
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
                  placeholder="Record investigation notes..." 
                  className="w-full text-sm rounded-lg border border-border/60 bg-black/30 p-3 text-white placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all resize-none"
                />
                <Button size="sm" className="bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(0,100,255,0.3)]">Record Entry</Button>
              </form>

              <div className="space-y-3 pt-2">
                {incident.comments.map(c => (
                  <div key={c.id} className="p-4 rounded-lg border border-border/50 bg-black/20 hover:border-primary/30 transition-colors">
                    <div className="flex justify-between items-center text-xs text-muted-foreground mb-3">
                      <span className="font-semibold text-white/90">{c.author.name} <span className="opacity-50 text-xs font-normal">({c.author.role})</span></span>
                      <span className="font-mono text-[10px]">{c.createdAt.toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed">{c.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card rounded-xl overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-border/50 bg-black/10">
              <CardTitle className="text-white/90 text-sm font-semibold tracking-wide">Context Details</CardTitle>
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
                <strong className="block text-muted-foreground text-[11px] uppercase tracking-wider mb-1">Creation Timeline</strong>
                <span className="font-mono text-xs text-foreground/80">{incident.createdAt.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {session.user.role !== 'REPORTER' && (
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
