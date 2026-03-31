import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 })
  const url = new URL(req.url);
  const idPath = url.pathname.split('/').pop();

  const incident = await db.incident.findUnique({
    where: { id: idPath },
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      asset: true,
      comments: {
        include: { author: { select: { name: true, role: true } } },
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  if (!incident) return new NextResponse("Not Found", { status: 404 })

  if (session.user.role === 'REPORTER' && incident.reporterId !== session.user.id) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  return NextResponse.json(incident)
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 })
  const url = new URL(req.url);
  const idPath = url.pathname.split('/').pop();

  if (session.user.role === 'REPORTER') {
    return new NextResponse("Forbidden", { status: 403 })
  }

  try {
    const body = await req.json()
    const { status, assigneeId, severity, assetId } = body

    const existingIncident = await db.incident.findUnique({ where: { id: idPath } })
    if (!existingIncident) return new NextResponse("Not Found", { status: 404 })

    const updateData: any = {}
    if (status) updateData.status = status
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId
    if (severity) updateData.severity = severity
    if (assetId !== undefined) updateData.assetId = assetId

    const updatedIncident = await db.incident.update({
      where: { id: idPath },
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
