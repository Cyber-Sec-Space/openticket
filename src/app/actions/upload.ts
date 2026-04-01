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

  // BOLA & RBAC Entity Verification checks
  if (vulnId) {
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SECOPS') {
       return { error: "Forbidden: Strict Vuln BOLA enforcement" }
    }
    const vuln = await db.vulnerability.findUnique({ where: { id: vulnId }, select: { id: true }})
    if (!vuln) return { error: "Vulnerability context invalid" }
  }

  if (incidentId) {
    const incident = await db.incident.findUnique({
      where: { id: incidentId },
      select: { reporterId: true, assignees: { select: { id: true } } }
    })
    
    if (!incident) return { error: "Incident context invalid" }

    if (session.user.role === 'REPORTER') {
       const isReporter = incident.reporterId === session.user.id
       const isAssigned = incident.assignees.some(a => a.id === session.user.id)
       if (!isReporter && !isAssigned) {
          return { error: "Forbidden: Strict Incident BOLA isolation" }
       }
    }
  }

  // Basic securing of upload
  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    return { error: "File exceeds 10MB limit" }
  }

  const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.csv', '.zip', '.docx', '.log', '.json']
  const fileExt = path.extname(file.name).toLowerCase()
  
  if (!allowedExtensions.includes(fileExt)) {
    return { error: "Security Violation: Unsupported or potentially malicious file extension." }
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
