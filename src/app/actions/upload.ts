"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import fs from "fs"
import path from "path"
import { z } from "zod"
import crypto from "crypto"
import { hasPermission } from "@/lib/auth-utils"
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
    const hasPrivilege = hasPermission(session as any, 'UPDATE_VULNERABILITIES')
    if (!hasPrivilege) {
       return { error: "Forbidden: Strict Vuln BOLA enforcement" }
    }
    const vuln = await db.vulnerability.findUnique({ where: { id: vulnId }, select: { id: true }})
    if (!vuln) return { error: "Vulnerability context invalid" }
  }

  if (incidentId) {
    if (!hasPermission(session as any, 'UPLOAD_INCIDENT_ATTACHMENTS')) return { error: "Forbidden: Direct capability blocked" }
    const canViewAll = hasPermission(session as any, 'VIEW_INCIDENTS_ALL')
    const canViewAssigned = hasPermission(session as any, 'VIEW_INCIDENTS_ASSIGNED')
    const canViewUnassigned = hasPermission(session as any, 'VIEW_INCIDENTS_UNASSIGNED')

    if (!canViewAll && !canViewAssigned && !canViewUnassigned) {
       return { error: "Forbidden: Absolute Zero-Trust. You lack baseline view clearance." }
    }

    if (!canViewAll) {
       const incident = await db.incident.findUnique({
         where: { id: incidentId },
         select: { reporterId: true, assignees: { select: { id: true } } }
       })
       if (!incident) return { error: "Incident context invalid" }

       let isAuthorized = incident.reporterId === session.user.id
       
       if (!isAuthorized) {
          if (canViewAssigned && incident.assignees.some(a => a.id === session.user.id)) isAuthorized = true
          if (canViewUnassigned && incident.assignees.length === 0) isAuthorized = true
       }
       
       if (!isAuthorized) {
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
  const hasPrivilege = hasPermission(session as any, 'DELETE_INCIDENT_ATTACHMENTS')
  const canViewAll = hasPermission(session as any, 'VIEW_INCIDENTS_ALL')
  const canViewAssigned = hasPermission(session as any, 'VIEW_INCIDENTS_ASSIGNED')
  const canViewUnassigned = hasPermission(session as any, 'VIEW_INCIDENTS_UNASSIGNED')
  
  // Absolute Zero-Trust Evaluation
  if (attachment.incident && !canViewAll && !canViewAssigned && !canViewUnassigned) {
     return { error: "Forbidden: Absolute Zero-Trust. You lack baseline view clearance to operate on this dataset." }
  }

  if (!hasPrivilege && attachment.uploaderId !== session.user.id) {
     return { error: "Forbidden: You cannot delete evidence you did not upload." }
  }

  // Ensure they still have baseline isolation context to the incident
  if (attachment.incident && !canViewAll) {
     let isAuthorized = attachment.incident.reporterId === session.user.id
       
     if (!isAuthorized) {
        if (canViewAssigned && attachment.incident.assignees.some(a => a.id === session.user.id)) isAuthorized = true
        if (canViewUnassigned && attachment.incident.assignees.length === 0) isAuthorized = true
     }
     
     if (!isAuthorized) {
        return { error: "Forbidden: You do not have contextual access to manage this incident's forensic evidence." }
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

  await db.attachment.deleteMany({ where: { id: attachmentId }})

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
