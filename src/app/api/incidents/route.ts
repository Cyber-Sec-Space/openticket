import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 })

  const { searchParams } = new URL(req.url)
  const filterParams: any = {}
  
  if (session.user.role === 'REPORTER') {
    filterParams.reporterId = session.user.id
  }

  const incidents = await db.incident.findMany({
    where: filterParams,
    include: {
      reporter: { select: { name: true, email: true } },
      assignees: { select: { name: true, email: true } },
      asset: { select: { name: true, type: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(incidents)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 })

  try {
    const body = await req.json()
    const { title, description, severity, assetId } = body

    if (!title || !description) {
      return new NextResponse("Title and Description are required", { status: 400 })
    }

    const newIncident = await db.incident.create({
      data: {
        title,
        description,
        severity: severity || 'LOW',
        reporterId: session.user.id,
        assetId: assetId || null,
        status: 'NEW'
      }
    })

    // Log the action
    await db.auditLog.create({
      data: {
        action: "INCIDENT_CREATED",
        entityType: "Incident",
        entityId: newIncident.id,
        userId: session.user.id,
        changes: { title, severity }
      }
    })

    return NextResponse.json(newIncident, { status: 201 })
  } catch (error) {
    console.error("[POST /api/incidents]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
