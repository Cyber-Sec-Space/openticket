import { auth } from "@/auth"
import { db } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  // Security check mapping
  if (!incident || (session.user.role === 'REPORTER' && incident.reporterId !== session.user.id)) {
    notFound()
  }

  // Define Server Actions for Admins/SecOps inline Since Next.js Next 14/15 allows closures
  async function updateStatus(formData: FormData) {
    "use server"
    const sessionUrl = await auth()
    if (!sessionUrl || sessionUrl.user.role === 'REPORTER') throw new Error("Forbidden")
    
    await db.incident.update({
      where: { id: incident!.id },
      data: { status: formData.get("status") as any }
    })
    
    await db.auditLog.create({
      data: {
        action: "STATUS_CHANGED",
        entityType: "Incident",
        entityId: incident!.id,
        userId: sessionUrl.user.id,
        changes: { status: formData.get("status") as string }
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
              {incident.comments.map(c => (
                <div key={c.id} className="p-4 rounded-lg border border-border/50 bg-black/20 hover:border-primary/30 transition-colors">
                  <div className="flex justify-between items-center text-xs text-muted-foreground mb-3">
                    <span className="font-semibold text-white/90">{c.author.name} <span className="opacity-50 text-xs font-normal">({c.author.role})</span></span>
                    <span className="font-mono text-[10px]">{c.createdAt.toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">{c.content}</p>
                </div>
              ))}
              
              <form action={async (formData) => {
                "use server"
                const sessionUrl = await auth()
                const content = formData.get("content") as string
                if (!content || !sessionUrl) return;
                await db.comment.create({
                  data: { content, incidentId: incident!.id, authorId: sessionUrl.user.id }
                })
                redirect(`/incidents/${incident!.id}`)
              }} className="space-y-3 pt-4 border-t border-border/50">
                <textarea 
                  name="content" 
                  rows={3} 
                  required
                  placeholder="Record investigation notes..." 
                  className="w-full text-sm rounded-lg border border-border/60 bg-black/30 p-3 text-white placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                />
                <Button size="sm" className="bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(0,100,255,0.3)]">Record Entry</Button>
              </form>
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
                <strong className="block text-muted-foreground text-[11px] uppercase tracking-wider mb-1">Assigned Handler</strong>
                <span className={incident.assignee ? "text-foreground/90 font-medium" : "text-muted-foreground italic"}>
                  {incident.assignee ? incident.assignee.name : "Unassigned"}
                </span>
              </div>
              <div>
                <strong className="block text-muted-foreground text-[11px] uppercase tracking-wider mb-1">Target Asset</strong>
                {incident.asset ? (
                  <Link href={`/assets/${incident.asset.id}`} className="text-primary hover:underline font-mono text-xs">
                    {incident.asset.name}
                  </Link>
                ) : <span className="text-muted-foreground italic">None Linked</span>}
              </div>
              <div>
                <strong className="block text-muted-foreground text-[11px] uppercase tracking-wider mb-1">Creation Timeline</strong>
                <span className="font-mono text-xs text-foreground/80">{incident.createdAt.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {session.user.role !== 'REPORTER' && (
            <div className="glass-card rounded-xl overflow-hidden shadow-2xl border border-primary/20">
              <CardHeader className="border-b border-border/50 bg-primary/5">
                <CardTitle className="text-primary text-sm font-semibold tracking-wide">Execution Policy</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Adjust operational state</CardDescription>
              </CardHeader>
              <div className="p-6">
                <form action={updateStatus} className="space-y-4">
                  <select name="status" defaultValue={incident.status} className="w-full rounded-md border border-border/60 bg-black/50 p-2.5 text-sm text-white focus:ring-2 focus:ring-primary focus:outline-none transition-all">
                    <option value="NEW">NEW</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="PENDING_INFO">PENDING_INFO</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/80 shadow-[0_0_15px_rgba(0,255,200,0.2)]">Commit State</Button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
