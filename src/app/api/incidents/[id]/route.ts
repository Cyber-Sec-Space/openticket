import { apiAuth } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await apiAuth()
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 })
  if (!hasPermission(session as any, ['VIEW_INCIDENTS_ALL', 'VIEW_INCIDENTS_ASSIGNED', 'VIEW_INCIDENTS_UNASSIGNED'])) return new NextResponse("Forbidden", { status: 403 })

  try {
    const incident = await db.incident.findUnique({
      where: { id },
      include: {
        reporter: { select: { name: true, email: true } },
        assignees: { select: { name: true, email: true, id: true } },
        asset: { select: { name: true, type: true } },
        comments: { include: { author: { select: { name: true, customRoles: { select: { name: true } } } } } },
        attachments: true
      }
    })

    if (!incident) return new NextResponse("Not Found", { status: 404 })

    const canViewAll = hasPermission(session as any, 'VIEW_INCIDENTS_ALL')
    const canViewAssigned = hasPermission(session as any, 'VIEW_INCIDENTS_ASSIGNED')
    const canViewUnassigned = hasPermission(session as any, 'VIEW_INCIDENTS_UNASSIGNED')
    
    // Strict isolation enforcement
    let isAuthorized = canViewAll || incident.reporterId === session.user.id
    if (!isAuthorized) {
        if (canViewAssigned && incident.assignees.some(a => a.id === session.user.id)) isAuthorized = true
        if (canViewUnassigned && incident.assignees.length === 0) isAuthorized = true
    }

    if (!isAuthorized) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    return NextResponse.json(incident)
  } catch (error) {
    console.error("[GET /api/incidents/[id]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

import { hasPermission } from "@/lib/auth-utils"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await apiAuth()
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 })

  try {
    const hasAssignAll = hasPermission(session as any, 'ASSIGN_INCIDENTS_OTHERS')
    const hasAssignSelf = hasPermission(session as any, 'ASSIGN_INCIDENTS_SELF')
    const hasMetadata = hasPermission(session as any, 'UPDATE_INCIDENTS_METADATA')
    const canClose = hasPermission(session as any, 'UPDATE_INCIDENT_STATUS_CLOSE')
    const canResolve = hasPermission(session as any, 'UPDATE_INCIDENT_STATUS_RESOLVE')

    const body = await req.json()
    const { status, assigneeId, severity, assetId } = body

    const existingIncident = await db.incident.findUnique({ 
      where: { id },
      include: { assignees: true }
    })
    if (!existingIncident) return new NextResponse("Not Found", { status: 404 })

    // Enforce Zero-Trust BOLA Isolation before allowing any mutation blocks
    const canViewAll = hasPermission(session as any, 'VIEW_INCIDENTS_ALL')
    const canViewAssigned = hasPermission(session as any, 'VIEW_INCIDENTS_ASSIGNED')
    const canViewUnassigned = hasPermission(session as any, 'VIEW_INCIDENTS_UNASSIGNED')
    
    let isAuthorized = canViewAll || existingIncident.reporterId === session.user.id
    if (!isAuthorized) {
        if (canViewAssigned && existingIncident.assignees.some(a => a.id === session.user.id)) isAuthorized = true
        if (canViewUnassigned && existingIncident.assignees.length === 0) isAuthorized = true
    }

    if (!isAuthorized) {
      return new NextResponse("Forbidden: Strict BOLA isolation restricts this action to owner/assignee context.", { status: 403 })
    }

    const isAssigned = existingIncident.assignees.some(a => a.id === session.user.id)
    
    if (assigneeId !== undefined) {
       if (!hasAssignAll) {
          if (!hasAssignSelf || assigneeId !== session.user.id) {
             return new NextResponse("Forbidden: You lack permission to reassign this incident.", { status: 403 })
          }
       }
    }

    if ((severity !== undefined || assetId !== undefined) && !hasAssignAll && !(isAssigned && hasMetadata)) {
       return new NextResponse("Forbidden: Setting severities or assets requires explicit assignment privileges.", { status: 403 })
    }

    if (status) {
       if (status === 'CLOSED' && !canClose) return new NextResponse("Forbidden: Missing CLOSE privilege", { status: 403 })
       if (status === 'RESOLVED' && !canResolve) return new NextResponse("Forbidden: Missing RESOLVE privilege", { status: 403 })
       if (status !== 'CLOSED' && status !== 'RESOLVED' && !hasAssignAll && !(isAssigned && hasMetadata)) {
          return new NextResponse("Forbidden: Only assignees can change status progression.", { status: 403 })
       }
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (assigneeId !== undefined) {
      updateData.assignees = assigneeId === null ? { set: [] } : { set: [{ id: assigneeId }] }
    }
    if (severity) updateData.severity = severity
    if (assetId !== undefined) {
       if (!hasPermission(session as any, 'LINK_INCIDENT_TO_ASSET')) {
          return new NextResponse("Forbidden: Missing LINK_INCIDENT_TO_ASSET privilege", { status: 403 })
       }
       updateData.assetId = assetId
    }

    const updatedIncident = await db.incident.update({
      where: { id },
      data: updateData
    })

    await db.auditLog.create({
      data: {
        action: "INCIDENT_UPDATED",
        entityType: "Incident",
        entityId: existingIncident.id,
        userId: session.user.id,
        changes: updateData
      }
    })

    return NextResponse.json(updatedIncident)
  } catch (error) {
    console.error("[PATCH /api/incidents/[id]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
