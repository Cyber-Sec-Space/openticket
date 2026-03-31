import { auth } from "@/auth"
import { db } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <Link href="/incidents">
        <Button variant="ghost">← Back to List</Button>
      </Link>
      
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{incident.title}</h1>
          <p className="text-muted-foreground mt-1">Ticket ID: {incident.id}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={incident.severity === 'CRITICAL' ? 'destructive' : 'secondary'}>
            {incident.severity}
          </Badge>
          <Badge variant="outline">{incident.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 dark:text-slate-200">
                {incident.description}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conversation & Logs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {incident.comments.map(c => (
                <div key={c.id} className="p-4 rounded border bg-slate-50 dark:bg-slate-900">
                  <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
                    <span className="font-semibold">{c.author.name} ({c.author.role})</span>
                    <span>{c.createdAt.toLocaleString()}</span>
                  </div>
                  <p className="text-sm">{c.content}</p>
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
              }} className="space-y-2">
                <textarea 
                  name="content" 
                  rows={3} 
                  required
                  placeholder="Leave a comment or update..." 
                  className="w-full text-sm rounded-md border p-2"
                />
                <Button size="sm">Add Comment</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <strong className="block text-muted-foreground text-xs">Reporter</strong>
                {incident.reporter.name} ({incident.reporter.email})
              </div>
              <div>
                <strong className="block text-muted-foreground text-xs">Assignee</strong>
                {incident.assignee ? incident.assignee.name : "Unassigned"}
              </div>
              <div>
                <strong className="block text-muted-foreground text-xs">Affected Asset</strong>
                {incident.asset ? (
                  <Link href={`/assets/${incident.asset.id}`} className="text-blue-500 hover:underline">
                    {incident.asset.name}
                  </Link>
                ) : "None"}
              </div>
              <div>
                <strong className="block text-muted-foreground text-xs">Reported At</strong>
                {incident.createdAt.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          {session.user.role !== 'REPORTER' && (
            <Card>
              <CardHeader>
                <CardTitle>SecOps Actions</CardTitle>
                <CardDescription>Update investigation status</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={updateStatus} className="space-y-4">
                  <select name="status" defaultValue={incident.status} className="w-full rounded border p-2 text-sm bg-background">
                    <option value="NEW">NEW</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="PENDING_INFO">PENDING INFO</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                  <Button type="submit" className="w-full">Update Status</Button>
                </form>

                {/* Optional Assignment implementation can go here */}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
