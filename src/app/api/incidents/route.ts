import { apiAuth } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const session = await apiAuth()
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 })

  const { searchParams } = new URL(req.url)
  const filterParams: any = {}
  
  const hasPrivilege = session.user.roles.includes('ADMIN') || session.user.roles.includes('SECOPS')
  if (!hasPrivilege) {
    filterParams.reporterId = session.user.id
  }

  const takeParam = searchParams.get("take");
  const skipParam = searchParams.get("skip");
  
  let take = parseInt(takeParam || "100", 10);
  let skip = parseInt(skipParam || "0", 10);
  
  if (Number.isNaN(take)) take = 100;
  if (Number.isNaN(skip)) skip = 0;
  
  take = Math.min(take, 100);

  const incidents = await db.incident.findMany({
    where: filterParams,
    include: {
      reporter: { select: { name: true, email: true } },
      assignees: { select: { name: true, email: true } },
      asset: { select: { name: true, type: true } }
    },
    orderBy: { createdAt: 'desc' },
    take,
    skip
  })

  return NextResponse.json(incidents)
}

export async function POST(req: Request) {
  const session = await apiAuth()
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 })

  try {
    const body = await req.json()
    const { title, description, severity, assetId, tags = [] } = body

    if (!title || !description) {
      return new NextResponse("Title and Description are required", { status: 400 })
    }
    
    let processedTags: string[] = []
    if (Array.isArray(tags)) {
      processedTags = tags.map(t => String(t).trim()).filter(t => t !== '').map(t => t.startsWith('#') ? t : `#${t}`)
    }

    const newIncident = await db.incident.create({
      data: {
        title,
        description,
        severity: severity || 'LOW',
        reporterId: session.user.id,
        assetId: assetId || null,
        status: 'NEW',
        tags: processedTags
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

    // SOAR Dynamics Auto Quarantine Sync for Zero-Day Creation
    if (newIncident.severity === 'CRITICAL' && newIncident.assetId) {
      await db.asset.update({
        where: { id: newIncident.assetId },
        data: { status: 'COMPROMISED' }
      })

      await db.auditLog.create({
        data: {
          action: "SOAR_AUTO_QUARANTINE",
          entityType: "Asset",
          entityId: newIncident.assetId,
          userId: session.user.id,
          changes: `Asset automatically marked as COMPROMISED due to CRITICAL Incident INC-${newIncident.id.substring(0, 8).toUpperCase()} directly filed.`
        }
      })
    }

    return NextResponse.json(newIncident, { status: 201 })
  } catch (error) {
    console.error("[POST /api/incidents]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
