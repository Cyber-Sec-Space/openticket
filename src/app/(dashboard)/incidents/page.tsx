import { auth } from "@/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ShieldAlert, Plus } from "lucide-react"

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
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center">
            <ShieldAlert className="mr-3 text-primary h-8 w-8" /> Active Incidents
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Monitor, assign, and respond to ongoing security tickets across the enterprise.</p>
        </div>
        <Link href="/incidents/new">
          <Button className="bg-primary hover:bg-primary/80 text-primary-foreground shadow-[0_0_10px_rgba(0,255,200,0.3)]">
            <Plus className="w-4 h-4 mr-2" /> Report Incident
          </Button>
        </Link>
      </div>

      <div className="glass-card rounded-xl overflow-hidden border border-border">
        <Table>
          <TableHeader className="bg-black/20">
            <TableRow className="border-border">
              <TableHead className="font-semibold text-primary">Title</TableHead>
              <TableHead className="font-semibold text-primary">Severity</TableHead>
              <TableHead className="font-semibold text-primary">Status</TableHead>
              <TableHead className="font-semibold text-primary">Reporter</TableHead>
              <TableHead className="font-semibold text-primary">Assignee</TableHead>
              <TableHead className="font-semibold text-primary text-right">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                  No incidents found matching your criteria.
                </TableCell>
              </TableRow>
            ) : incidents.map(incident => (
              <TableRow 
                key={incident.id} 
                className="cursor-pointer border-border hover:bg-primary/5 transition-colors relative group"
              >
                <TableCell className="font-medium text-foreground">
                  <Link href={`/incidents/${incident.id}`} className="absolute inset-0" aria-label={`View ${incident.title}`} />
                  {incident.title}
                </TableCell>
                <TableCell>
                  <Badge className={`bg-transparent border ${incident.severity === 'CRITICAL' ? 'border-destructive text-destructive shadow-[0_0_10px_rgba(255,50,50,0.2)] animate-pulse' : 'border-primary text-primary'}`}>
                    {incident.severity}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
                    {incident.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{incident.reporter?.name || "Unknown"}</TableCell>
                <TableCell className="text-muted-foreground">{incident.assignee?.name || "Unassigned"}</TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">{incident.createdAt.toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
