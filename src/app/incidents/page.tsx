import { auth } from "@/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default async function IncidentsPage() {
  const session = await auth()
  if (!session?.user) return null

  const filterParams: any = {}
  if (session.user.role === 'REPORTER') {
    filterParams.reporterId = session.user.id
  }

  const incidents = await db.incident.findMany({
    where: filterParams,
    include: {
      reporter: { select: { name: true } },
      assignee: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Incidents</h1>
          <p className="text-muted-foreground mt-1">Manage and track your security incidents here.</p>
        </div>
        <Link href="/incidents/new">
          <Button>Report Incident</Button>
        </Link>
      </div>

      <div className="border rounded-md shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reporter</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  No incidents found.
                </TableCell>
              </TableRow>
            ) : incidents.map(incident => (
              <TableRow key={incident.id} className="cursor-pointer hover:bg-muted/50 transition-colors relative group">
                <TableCell className="font-medium">
                  <Link href={`/incidents/${incident.id}`} className="absolute inset-0" aria-label={`View ${incident.title}`} />
                  {incident.title}
                </TableCell>
                <TableCell>
                  <Badge variant={incident.severity === 'CRITICAL' ? 'destructive' : 'default'}>
                    {incident.severity}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{incident.status}</Badge>
                </TableCell>
                <TableCell>{incident.reporter?.name || "Unknown"}</TableCell>
                <TableCell>{incident.assignee?.name || "Unassigned"}</TableCell>
                <TableCell>{incident.createdAt.toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4">
        <Link href="/">
          <Button variant="ghost">← Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
