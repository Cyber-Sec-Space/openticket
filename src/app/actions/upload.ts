"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import fs from "fs"
import path from "path"
import { z } from "zod"
import crypto from "crypto"


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
    const hasPrivilege = session.user.roles.includes('ADMIN') || session.user.roles.includes('SECOPS')
    if (!hasPrivilege) {
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

    const hasPrivilege = session.user.roles.includes('ADMIN') || session.user.roles.includes('SECOPS')
    if (!hasPrivilege) {
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

  // Make sure upload dir exists (in private so it is NOT served statically)
  const uploadsDir = path.join(process.cwd(), "private", "uploads")
  try {
    await fs.promises.mkdir(uploadsDir, { recursive: true })
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
  }

  const safeFilename = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
  const filePath = path.join(uploadsDir, safeFilename)

  await fs.promises.writeFile(filePath, buffer)

  const createdFile = await db.attachment.create({
    data: {
      filename: file.name,
      fileUrl: `/api/files/${safeFilename}`,
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

export async function deleteAttachment(attachmentId: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  const attachment = await db.attachment.findUnique({
    where: { id: attachmentId },
    include: {
      incident: { select: { reporterId: true, assignees: { select: { id: true } } } },
      vuln: { select: { id: true } }
    }
  })

  if (!attachment) return { error: "Not found" }

  // RBAC for Delete
  const hasPrivilege = session.user.roles.includes('ADMIN') || session.user.roles.includes('SECOPS')
  if (!hasPrivilege) {
    if (attachment.uploaderId !== session.user.id) {
       // Also check if they are assigned to the parent incident
       if (attachment.incident) {
          const isAssigned = attachment.incident.assignees.some(a => a.id === session.user.id)
          if (!isAssigned) return { error: "Forbidden: You cannot delete evidence you did not upload." }
       } else {
          return { error: "Forbidden: You cannot delete evidence you did not upload." }
       }
    }
  }

  // Delete from filesystem securely
  try {
     const safeBase = path.resolve(process.cwd(), 'private', 'uploads')
     const filename = path.basename(attachment.fileUrl)
     const filePath = path.resolve(safeBase, filename)
     
     if (filePath.startsWith(safeBase)) {
       try {
         await fs.promises.unlink(filePath)
       } catch (e) {
         if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
       }
     }
  } catch(e) {
     console.error("Failed deleting file", e)
  }

  await db.attachment.delete({ where: { id: attachmentId }})

  if (attachment.incidentId) {
    await db.auditLog.create({
      data: {
        action: "ATTACHMENT_DELETED",
        entityType: "Incident",
        entityId: attachment.incidentId,
        userId: session.user.id,
        changes: `Deleted evidence file: ${attachment.filename}`
      }
    })
  }

  return { success: true }
}
