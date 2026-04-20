import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.requires2FASetup) return new NextResponse("Unauthorized", { status: 401 });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let isActive = true;

      // Ensure connection keeps alive and doesn't timeout
      const keepAlive = setInterval(() => {
        if (isActive) {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        }
      }, 15000);

      req.signal.addEventListener("abort", () => {
        isActive = false;
        clearInterval(keepAlive);
      });

      while (isActive) {
        try {
          // Fetch unpushed alerts
          const unpushedAlerts = await db.userNotification.findMany({
            where: {
              userId: session.user.id,
              isPushed: false
            },
            orderBy: { createdAt: "asc" },
            take: 50
          });

          if (unpushedAlerts.length > 0) {
            // Attempt to atomically claim the notifications
            for (const alert of unpushedAlerts) {
              const result = await db.userNotification.updateMany({
                where: { id: alert.id, isPushed: false },
                data: { isPushed: true }
              });

              // If count > 0, this SSE stream won the race.
              if (result.count > 0 && isActive) {
                const data = JSON.stringify(alert);
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            }
          }
        } catch (error) {
          console.error("SSE Polling Database Error:", error);
        }
        
        // Wait 3 seconds before polling again
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    },
    cancel() {
      // Stream cancelled by client
    }
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
