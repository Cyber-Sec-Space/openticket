import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { hasPermission } from "@/lib/auth-utils"

function sanitizeCsvCell(value: string) {
  const escaped = value.replace(/"/g, '""')
  if (/^[=\+\-@\t\r]/.test(escaped)) {
    return `'${escaped}`
  }
  return escaped
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'incident'
  const statusFilter = searchParams.get('status')
  const skipParam = parseInt(searchParams.get('skip') || '0', 10)
  const skip = isNaN(skipParam) ? 0 : skipParam

  const canExportIncidents = hasPermission(session as any, 'EXPORT_INCIDENTS')
  const canViewAll = hasPermission(session as any, 'VIEW_INCIDENTS_ALL')
  let csvContent = ""

  if (type === 'incident') {
    const whereClause: any = {}
    if (statusFilter && statusFilter !== 'ALL') {
      whereClause.status = statusFilter
    }
    
    // BOLA Enforcement: Strict export limitation
    if (!canExportIncidents) {
       return new NextResponse("Forbidden: You require standard or advanced export permissions.", { status: 403 })
    }

    const canViewAssigned = hasPermission(session as any, 'VIEW_INCIDENTS_ASSIGNED')
    const canViewUnassigned = hasPermission(session as any, 'VIEW_INCIDENTS_UNASSIGNED')

    if (!canViewAll && !canViewAssigned && !canViewUnassigned) {
       return new NextResponse("Forbidden: No view permissions granted.", { status: 403 })
    }

    if (!canViewAll) {
       const assignedConditions = []
       if (canViewAssigned) {
          assignedConditions.push({ reporterId: session.user.id })
          assignedConditions.push({ assignees: { some: { id: session.user.id } } })
       }
       if (canViewUnassigned) {
          assignedConditions.push({ assignees: { none: {} } })
       }
       whereClause.OR = assignedConditions
    }
    
    // Resource Constraint Enforcement (OOM Prevention) w/ Safe Paging
    const incidents = await db.incident.findMany({
      where: whereClause,
      include: { asset: true, reporter: true, assignees: true },
      orderBy: { createdAt: 'desc' },
      take: 5000,
      skip: skip
    })

    const headers = ["ID", "Title", "Type", "Severity", "Status", "Asset", "Reporter", "Assignees", "SLA Target Date", "Created At"]
    csvContent += headers.join(",") + "\n"

    for (const incident of incidents) {
      const assigneesStr = incident.assignees.map(a => a.name).join("; ")
      const row = [
        incident.id,
        `"${sanitizeCsvCell(incident.title)}"`,
        incident.type,
        incident.severity,
        incident.status,
        incident.asset?.name || "Unlinked",
        incident.reporter?.name || incident.reporter?.email || "Deleted Operator",
        `"${sanitizeCsvCell(assigneesStr)}"`,
        incident.targetSlaDate ? incident.targetSlaDate.toISOString() : "None",
        incident.createdAt.toISOString()
      ]
      csvContent += row.join(",") + "\n"
    }
  } else if (type === 'vulnerability') {
    // BOLA Enforcement
    const hasVulnExportPrivilege = hasPermission(session as any, 'VIEW_VULNERABILITIES') && hasPermission(session as any, 'EXPORT_INCIDENTS')
    if (!hasVulnExportPrivilege) {
       return new NextResponse("Forbidden: Comprehensive Threat intelligence extracts mandate explicit clearance.", { status: 403 })
    }

    const whereClause: any = {}
    if (statusFilter && statusFilter !== 'ALL') {
      whereClause.status = statusFilter
    }

    // Resource Constraint Enforcement (OOM Prevention)
    const vulns = await db.vulnerability.findMany({
      where: whereClause,
      include: { vulnerabilityAssets: { include: { asset: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5000,
      skip: skip
    })

    const headers = ["ID", "CVE ID", "Title", "CVSS", "Severity", "Status", "Affected Assets", "SLA Target Date", "Created At"]
    csvContent += headers.join(",") + "\n"

    for (const vuln of vulns) {
      const assetsStr = vuln.vulnerabilityAssets.map((va: any) => va.asset.name).join("; ")
      const row = [
        vuln.id,
        vuln.cveId || "None",
        `"${sanitizeCsvCell(vuln.title)}"`,
        vuln.cvssScore || "0",
        vuln.severity,
        vuln.status,
        `"${sanitizeCsvCell(assetsStr)}"`,
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
