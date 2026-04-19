import { apiAuth } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { hasPermission } from "@/lib/auth-utils"

export async function GET(req: Request) {
  const session = await apiAuth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const hasPrivilege = hasPermission(session, 'VIEW_ASSETS')
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
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  
  const hasPrivilege = hasPermission(session, 'CREATE_ASSETS')
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

    let secureIp = null;
    if (ipAddress) {
       // Deeply restrict to valid IPv4 or IPv6 structures to prevent downstream LUA/Shell Ping injections
       const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
       const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
       
       if (!ipv4Regex.test(ipAddress) && !ipv6Regex.test(ipAddress)) {
          return new NextResponse("Invalid IP Address format. Payload rejected due to boundary violation.", { status: 400 })
       }
       secureIp = ipAddress;
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
