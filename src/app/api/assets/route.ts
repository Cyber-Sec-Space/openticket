import { apiAuth } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { hasPermission } from "@/lib/auth-utils"

export async function GET(req: Request) {
  const session = await apiAuth()
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 })

  const hasPrivilege = hasPermission(session as any, 'VIEW_ASSETS')
  if (!hasPrivilege) {
     return new NextResponse("Forbidden: Access to systemic assets is strictly restricted.", { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const takeParam = searchParams.get("take");
  const skipParam = searchParams.get("skip");
  
  let take = parseInt(takeParam || "100", 10);
  let skip = parseInt(skipParam || "0", 10);
  
  if (Number.isNaN(take) || take < 0) take = 100;
  if (Number.isNaN(skip) || skip < 0) skip = 0;
  
  take = Math.min(take, 100);

  const assets = await db.asset.findMany({
    orderBy: { createdAt: 'desc' },
    take,
    skip
  })

  return NextResponse.json(assets)
}

export async function POST(req: Request) {
  const session = await apiAuth()
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 })
  
  const hasPrivilege = hasPermission(session as any, 'CREATE_ASSETS')
  if (!hasPrivilege) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  try {
    const body = await req.json()
    const { name, type, ipAddress } = body

    if (!name) {
      return new NextResponse("Asset name is required", { status: 400 })
    }
    
    // Explicit Enum validation to prevent Prisma 500 Unhandled Exceptions
    const VALID_ASSET_TYPES = ['ROUTER', 'SWITCH', 'FIREWALL', 'SERVER', 'WORKSTATION', 'MOBILE_DEVICE', 'IOT_DEVICE', 'OTHER', 'LAPTOP', 'DESKTOP'];
    const finalType = type || 'OTHER';
    if (!VALID_ASSET_TYPES.includes(finalType)) {
       return new NextResponse(`Invalid Asset type. Accepted values: ${VALID_ASSET_TYPES.join(', ')}`, { status: 400 })
    }

    const newAsset = await db.asset.create({
      data: {
        name,
        type: finalType,
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
