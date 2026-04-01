import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'incident'
  const statusFilter = searchParams.get('status')
  
  let csvContent = ""

  if (type === 'incident') {
    const whereClause: any = {}
    if (statusFilter && statusFilter !== 'ALL') {
      whereClause.status = statusFilter
    }
    
    const incidents = await db.incident.findMany({
      where: whereClause,
      include: { asset: true, reporter: true, assignees: true },
      orderBy: { createdAt: 'desc' }
    })

    const headers = ["ID", "Title", "Type", "Severity", "Status", "Asset", "Reporter", "Assignees", "SLA Target Date", "Created At"]
    csvContent += headers.join(",") + "\n"

    for (const incident of incidents) {
      const assigneesStr = incident.assignees.map(a => a.name).join("; ")
      const row = [
        incident.id,
        `"${incident.title.replace(/"/g, '""')}"`,
        incident.type,
        incident.severity,
        incident.status,
        incident.asset?.name || "Unlinked",
        incident.reporter.name || incident.reporter.email,
        `"${assigneesStr}"`,
        incident.targetSlaDate ? incident.targetSlaDate.toISOString() : "None",
        incident.createdAt.toISOString()
      ]
      csvContent += row.join(",") + "\n"
    }
  } else if (type === 'vulnerability') {
    const whereClause: any = {}
    if (statusFilter && statusFilter !== 'ALL') {
      whereClause.status = statusFilter
    }

    const vulns = await db.vulnerability.findMany({
      where: whereClause,
      include: { affectedAssets: true },
      orderBy: { createdAt: 'desc' }
    })

    const headers = ["ID", "CVE ID", "Title", "CVSS", "Severity", "Status", "Affected Assets", "SLA Target Date", "Created At"]
    csvContent += headers.join(",") + "\n"

    for (const vuln of vulns) {
      const assetsStr = vuln.affectedAssets.map(a => a.name).join("; ")
      const row = [
        vuln.id,
        vuln.cveId || "None",
        `"${vuln.title.replace(/"/g, '""')}"`,
        vuln.cvssScore || "0",
        vuln.severity,
        vuln.status,
        `"${assetsStr}"`,
        vuln.targetSlaDate ? vuln.targetSlaDate.toISOString() : "None",
        vuln.createdAt.toISOString()
      ]
      csvContent += row.join(",") + "\n"
    }
  }

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="export-${type}s-${new Date().toISOString().split('T')[0]}.csv"`
    }
  })
}
