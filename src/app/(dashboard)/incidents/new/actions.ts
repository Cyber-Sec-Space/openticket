"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"

export async function createIncident(prevState: any, formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const severity = formData.get("severity") as string
  const assetId = formData.get("assetId") as string

  const type = formData.get("type") as string || "OTHER"

  if (!title || !description) {
    return { error: "Title and description are required." }
  }

  const newIncident = await db.incident.create({
    data: {
      title,
      description,
      type: type as any,
      severity: severity as any || 'LOW',
      reporterId: session.user.id,
      assetId: assetId || null,
      status: 'NEW'
    }
  })

  await db.auditLog.create({
    data: {
      action: "INCIDENT_CREATED",
      entityType: "Incident",
      entityId: newIncident.id,
      userId: session.user.id,
      changes: { title, severity }
    }
  })

  redirect(`/incidents/${newIncident.id}`)
}
