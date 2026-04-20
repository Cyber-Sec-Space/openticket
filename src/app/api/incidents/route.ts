import { apiAuth } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { hasPermission } from "@/lib/auth-utils"
import { getGlobalSettings } from "@/lib/settings";
import { logger } from "@/lib/logger";
import { randomUUID } from "crypto";

export async function GET(req: Request) {
  const session = await apiAuth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const filterParams: any = {}
  
  const canViewAll = hasPermission(session, 'VIEW_INCIDENTS_ALL')
  const canViewAssigned = hasPermission(session, 'VIEW_INCIDENTS_ASSIGNED')
  const canViewUnassigned = hasPermission(session, 'VIEW_INCIDENTS_UNASSIGNED')

  if (!canViewAll && !canViewAssigned && !canViewUnassigned) {
    return NextResponse.json([]) // Enforce absolute zero-trust view boundary
  }

  const takeParam = searchParams.get("take");
  const skipParam = searchParams.get("skip");
  
  let take = parseInt(takeParam || "100", 10);
  let skip = parseInt(skipParam || "0", 10);
  
  if (Number.isNaN(take) || take < 0) take = 100;
  if (Number.isNaN(skip) || skip < 0) skip = 0;
  
  take = Math.min(take, 100);

  // Add dynamic isolation limits based on exact viewport permissions
  const rbACWhere: any = {}
  
  if (!canViewAll) {
     const assignedConditions = []
     if (canViewAssigned) {
        assignedConditions.push({ reporterId: session.user.id })
        assignedConditions.push({ assignees: { some: { id: session.user.id } } })
     }
     if (canViewUnassigned) {
        assignedConditions.push({ assignees: { none: {} } })
     }
     rbACWhere.OR = assignedConditions
  }

  const incidents = await db.incident.findMany({
    where: {
       ...rbACWhere,
       ...filterParams
    },
    include: {
      reporter: { select: { name: true, email: true } },
      assignees: { select: { name: true, email: true } },
      assets: { select: { id: true, name: true, type: true } }
    },
    orderBy: { createdAt: 'desc' },
    take,
    skip
  })

  return NextResponse.json(incidents)
}

export async function POST(req: Request) {
  const session = await apiAuth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!hasPermission(session, 'CREATE_INCIDENTS')) return new NextResponse("Forbidden", { status: 403 })

  try {
    const body = await req.json()
    const { title, description, severity, assetIds = [], tags = [] } = body

    if (!title || !description) {
      return new NextResponse("Title and Description are required", { status: 400 })
    }

    if (title.length > 255 || description.length > 50000) {
      return new NextResponse("Input Boundary Violation: Title or description exceeds maximum allowed length.", { status: 400 })
    }
    
    let processedTags: string[] = []
    if (Array.isArray(tags)) {
      processedTags = tags.map(t => String(t).trim()).filter(t => t !== '').map(t => t.startsWith('#') ? t : `#${t}`)
    }

    // If user has CREATE_INCIDENTS, they are allowed to set initial target asset and severity
    const finalAssetIds = hasPermission(session, 'LINK_INCIDENT_TO_ASSET') && Array.isArray(assetIds) ? assetIds.filter(id => id !== 'NONE') : [];
    
    const VALID_SEVERITIES = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    let finalSeverity = severity || 'LOW';
    if (!VALID_SEVERITIES.includes(finalSeverity)) {
      return new NextResponse(`Invalid Severity. Accepted values: ${VALID_SEVERITIES.join(', ')}`, { status: 400 })
    }

    const settings = await getGlobalSettings()
    
    const newIncident = await db.$transaction(async (tx) => {
      const incident = await tx.incident.create({
        data: {
          title,
          description,
          severity: finalSeverity,
          reporterId: session.user.id,
          assets: finalAssetIds.length > 0 ? {
            connect: finalAssetIds.map((id: string) => ({ id }))
          } : undefined,
          status: 'NEW',
          tags: processedTags
        }
      })

      // Log the action
      await tx.auditLog.create({
        data: {
          action: "INCIDENT_CREATED",
          entityType: "Incident",
          entityId: incident.id,
          userId: session.user.id,
          changes: { title, severity }
        }
      })

      // SOAR Dynamics Auto Quarantine Sync for Zero-Day Creation
      const sevRank = { INFO: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }
      const currentRank = sevRank[incident.severity as keyof typeof sevRank] || 0
      const thresholdRank = sevRank[(settings?.soarAutoQuarantineThreshold as keyof typeof sevRank) || 'CRITICAL']

      if (settings?.soarAutoQuarantineEnabled && finalAssetIds.length > 0 && currentRank >= thresholdRank) {
        await tx.asset.updateMany({
          where: { id: { in: finalAssetIds } },
          data: { status: 'COMPROMISED' }
        })

        await tx.auditLog.create({
          data: {
            action: "SOAR_AUTO_QUARANTINE",
            entityType: "Incident",
            entityId: incident.id,
            userId: session.user.id,
            changes: `${finalAssetIds.length} Asset(s) automatically marked as COMPROMISED due to ${incident.severity} Incident INC-${incident.id.substring(0, 8).toUpperCase()} directly filed.`
          }
        })
      }
      
      return incident;
    });

    return NextResponse.json(newIncident, { status: 201 })
  } catch (error) {
    logger.error("Failed to create incident", { path: "/api/incidents", userId: session.user.id }, error);
    return new NextResponse("Internal Error", { status: 500 })
  }
}
