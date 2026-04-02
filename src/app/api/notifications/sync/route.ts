import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 })

  try {
    const unpushedAlerts = await db.userNotification.findMany({
      where: {
        userId: session.user.id,
        isPushed: false
      },
      orderBy: { createdAt: "asc" }
    })

    if (unpushedAlerts.length > 0) {
      await db.userNotification.updateMany({
        where: { id: { in: unpushedAlerts.map(a => a.id) } },
        data: { isPushed: true }
      })
    }

    return NextResponse.json(unpushedAlerts)
  } catch (error) {
    console.error("Browser Notifier Sync Error:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
