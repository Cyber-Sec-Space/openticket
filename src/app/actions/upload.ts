"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import fs from "fs"
import path from "path"
import { z } from "zod"

export async function uploadAttachment(formData: FormData) {
  const session = await auth()
  if (!session?.user) {
    return { error: "Unauthorized" }
  }

  const file = formData.get("file") as File
  const incidentId = formData.get("incidentId") as string | null
  const vulnId = formData.get("vulnId") as string | null

  if (!file) {
    return { error: "No file uploaded" }
  }

  if (!incidentId && !vulnId) {
    return { error: "Target association missing" }
  }

  // Basic securing of upload
  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    return { error: "File exceeds 10MB limit" }
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Make sure upload dir exists
  const uploadsDir = path.join(process.cwd(), "public", "uploads")
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  const safeFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
  const filePath = path.join(uploadsDir, safeFilename)

  fs.writeFileSync(filePath, buffer)

  const createdFile = await db.attachment.create({
    data: {
      filename: file.name,
      fileUrl: `/uploads/${safeFilename}`,
      uploaderId: session.user.id,
      incidentId: incidentId || null,
      vulnId: vulnId || null
    }
  })

  // Log action
  if (incidentId) {
    await db.auditLog.create({
      data: {
        action: "ATTACHMENT_UPLOADED",
        entityType: "Incident",
        entityId: incidentId,
        userId: session.user.id,
        changes: `Uploaded evidence file: ${file.name}`
      }
    })
  }

  return { success: true, url: createdFile.fileUrl, filename: createdFile.filename }
}
