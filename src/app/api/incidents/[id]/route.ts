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

  try {
    const incident = await db.incident.findUnique({
      where: { id },
      include: {
        reporter: { select: { name: true, email: true } },
        assignees: { select: { name: true, email: true, id: true } },
        asset: { select: { name: true, type: true } },
        comments: { include: { author: { select: { name: true, roles: true } } } },
        attachments: true
      }
    })

    if (!incident) return new NextResponse("Not Found", { status: 404 })

    const hasPrivilege = session.user.roles.includes('ADMIN') || session.user.roles.includes('SECOPS')
    
    // Strict isolation enforcement
    const isAuthorized = hasPrivilege || incident.reporterId === session.user.id || incident.assignees.some(a => a.id === session.user.id)
    if (!isAuthorized) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    return NextResponse.json(incident)
  } catch (error) {
    console.error("[GET /api/incidents/[id]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await apiAuth()
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 })

  try {
    const hasPrivilege = session.user.roles.includes('ADMIN') || session.user.roles.includes('SECOPS')
    const body = await req.json()
    const { status, assigneeId, severity, assetId } = body

    const existingIncident = await db.incident.findUnique({ 
      where: { id },
      include: { assignees: true }
    })
    if (!existingIncident) return new NextResponse("Not Found", { status: 404 })

    const isAuthorizedToUpdate = hasPrivilege || existingIncident.assignees.some(a => a.id === session.user.id)
    if (!isAuthorizedToUpdate) {
      return new NextResponse("Forbidden (Only ADMIN/SECOPS or Assigned Engineers can update)", { status: 403 })
    }

    if ((assigneeId !== undefined || severity !== undefined || assetId !== undefined) && !hasPrivilege) {
       return new NextResponse("Forbidden: Setting assignees, severities or assets requires Admin/Secops", { status: 403 })
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (assigneeId !== undefined) {
      updateData.assignees = assigneeId === null ? { set: [] } : { set: [{ id: assigneeId }] }
    }
    if (severity) updateData.severity = severity
    if (assetId !== undefined) updateData.assetId = assetId

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
