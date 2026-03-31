import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 })

  // Reporters should generally be able to list assets so they can tie incidents to them.
  // Optionally restrict this entirely to SecOps/Admins. MVP: all users can view assets.
  const assets = await db.asset.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(assets)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 })
  
  // Only Admins and SecOps can add assets to inventory.
  if (session.user.role === 'REPORTER') {
    return new NextResponse("Forbidden", { status: 403 })
  }

  try {
    const body = await req.json()
    const { name, type, ipAddress } = body

    if (!name) {
      return new NextResponse("Asset name is required", { status: 400 })
    }

    const newAsset = await db.asset.create({
      data: {
        name,
        type: type || 'OTHER',
        ipAddress: ipAddress || null,
        status: 'ACTIVE'
      }
    })

    await db.auditLog.create({
      data: {
        action: "ASSET_CREATED",
        entityType: "Asset",
        entityId: newAsset.id,
        userId: session.user.id,
        changes: { name, type, ipAddress }
      }
    })

    return NextResponse.json(newAsset, { status: 201 })
  } catch (error) {
    console.error("[POST /api/assets]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
