"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import fs from "fs"
import path from "path"
import { z } from "zod"
import crypto from "crypto"
import { revalidatePath } from "next/cache"
import { hasPermission } from "@/lib/auth-utils"
export async function uploadAttachment(formData: FormData) {
  const session = await auth()
  // #region agent log
  fetch('http://127.0.0.1:7451/ingest/93e51d37-4838-4ded-8cc4-6cd156753e67',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'33383f'},body:JSON.stringify({sessionId:'33383f',runId:'initial',hypothesisId:'H1',location:'src/app/actions/upload.ts:uploadAttachment:entry',message:'uploadAttachment called',data:{hasSession:!!session?.user,hasFile:!!formData.get("file"),hasIncidentId:!!formData.get("incidentId"),hasVulnId:!!formData.get("vulnId")},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
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
    const hasPrivilege = hasPermission(session, 'UPLOAD_VULN_ATTACHMENTS')
    if (!hasPrivilege || !hasPermission(session, 'VIEW_VULNERABILITIES')) {
       return { error: "Forbidden: Strict Vuln BOLA enforcement" }
    }
    const vuln = await db.vulnerability.findUnique({ where: { id: vulnId }, select: { id: true }})
    if (!vuln) return { error: "Vulnerability context invalid" }
  }

  if (incidentId) {
    if (!hasPermission(session, 'UPLOAD_INCIDENT_ATTACHMENTS')) return { error: "Forbidden: Direct capability blocked" }
    const canViewAll = hasPermission(session, 'VIEW_INCIDENTS_ALL')
    const canViewAssigned = hasPermission(session, 'VIEW_INCIDENTS_ASSIGNED')
    const canViewUnassigned = hasPermission(session, 'VIEW_INCIDENTS_UNASSIGNED')

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
  // #region agent log
  fetch('http://127.0.0.1:7451/ingest/93e51d37-4838-4ded-8cc4-6cd156753e67',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'33383f'},body:JSON.stringify({sessionId:'33383f',runId:'initial',hypothesisId:'H1',location:'src/app/actions/upload.ts:uploadAttachment:mkdir:before',message:'mkdir uploads dir start',data:{uploadsDir},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  try {
    await fs.promises.mkdir(uploadsDir, { recursive: true })
    // #region agent log
    fetch('http://127.0.0.1:7451/ingest/93e51d37-4838-4ded-8cc4-6cd156753e67',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'33383f'},body:JSON.stringify({sessionId:'33383f',runId:'initial',hypothesisId:'H1',location:'src/app/actions/upload.ts:uploadAttachment:mkdir:after',message:'mkdir uploads dir success',data:{uploadsDir},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  } catch (e) {
    // #region agent log
    fetch('http://127.0.0.1:7451/ingest/93e51d37-4838-4ded-8cc4-6cd156753e67',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'33383f'},body:JSON.stringify({sessionId:'33383f',runId:'initial',hypothesisId:'H1',location:'src/app/actions/upload.ts:uploadAttachment:mkdir:error',message:'mkdir uploads dir failed',data:{code:(e as NodeJS.ErrnoException).code,message:(e as Error).message},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
  }

  const safeFilename = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
  const filePath = path.join(uploadsDir, safeFilename)

  // #region agent log
  fetch('http://127.0.0.1:7451/ingest/93e51d37-4838-4ded-8cc4-6cd156753e67',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'33383f'},body:JSON.stringify({sessionId:'33383f',runId:'initial',hypothesisId:'H1',location:'src/app/actions/upload.ts:uploadAttachment:write:before',message:'write attachment start',data:{filePath,fileSize:buffer.byteLength,fileExt},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  await fs.promises.writeFile(filePath, buffer)
  // #region agent log
  fetch('http://127.0.0.1:7451/ingest/93e51d37-4838-4ded-8cc4-6cd156753e67',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'33383f'},body:JSON.stringify({sessionId:'33383f',runId:'initial',hypothesisId:'H1',location:'src/app/actions/upload.ts:uploadAttachment:write:after',message:'write attachment success',data:{filePath},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  const createdFile = await db.attachment.create({
    data: {
      filename: file.name,
      fileUrl: `/api/files/${safeFilename}`,
      uploaderId: session.user.id,
      incidentId: incidentId || null,
      vulnId: vulnId || null
    }
  })

  const { fireHook } = await import("@/lib/plugins/hook-engine");
  // #region agent log
  fetch('http://127.0.0.1:7451/ingest/93e51d37-4838-4ded-8cc4-6cd156753e67',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'33383f'},body:JSON.stringify({sessionId:'33383f',runId:'initial',hypothesisId:'H2',location:'src/app/actions/upload.ts:uploadAttachment:hook:before',message:'fireHook onEvidenceAttached start',data:{attachmentId:createdFile.id,incidentId:createdFile.incidentId,vulnId:createdFile.vulnId},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  await fireHook("onEvidenceAttached", createdFile);
  // #region agent log
  fetch('http://127.0.0.1:7451/ingest/93e51d37-4838-4ded-8cc4-6cd156753e67',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'33383f'},body:JSON.stringify({sessionId:'33383f',runId:'initial',hypothesisId:'H2',location:'src/app/actions/upload.ts:uploadAttachment:hook:after',message:'fireHook onEvidenceAttached settled',data:{attachmentId:createdFile.id},timestamp:Date.now()})}).catch(()=>{});
  // #endregion


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
    revalidatePath(`/incidents/${incidentId}`)
    revalidatePath(`/incidents/[id]`, 'page')
  }

  if (vulnId) {
    revalidatePath(`/vulnerabilities/${vulnId}`)
    revalidatePath(`/vulnerabilities/[id]`, 'page')
  }

  return { success: true, url: createdFile.fileUrl, filename: createdFile.filename }
}

export async function uploadAttachmentAction(
  prevState: { ok: boolean; error?: string } | undefined,
  formData: FormData
) {
  const result = await uploadAttachment(formData)
  if (result?.error) {
    // #region agent log
    fetch('http://127.0.0.1:7451/ingest/93e51d37-4838-4ded-8cc4-6cd156753e67',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'33383f'},body:JSON.stringify({sessionId:'33383f',runId:'post-fix',hypothesisId:'H5',location:'src/app/actions/upload.ts:uploadAttachmentAction:error',message:'uploadAttachmentAction returning error state',data:{error:result.error},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return { ok: false, error: result.error }
  }
  // #region agent log
  fetch('http://127.0.0.1:7451/ingest/93e51d37-4838-4ded-8cc4-6cd156753e67',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'33383f'},body:JSON.stringify({sessionId:'33383f',runId:'post-fix',hypothesisId:'H5',location:'src/app/actions/upload.ts:uploadAttachmentAction:success',message:'uploadAttachmentAction returning success state',data:{ok:true},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return { ok: true }
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
  const hasIncidentDeletePrivilege = hasPermission(session, 'DELETE_INCIDENT_ATTACHMENTS')
  const hasVulnDeletePrivilege = hasPermission(session, 'DELETE_VULN_ATTACHMENTS')

  const canViewAll = hasPermission(session, 'VIEW_INCIDENTS_ALL')
  const canViewAssigned = hasPermission(session, 'VIEW_INCIDENTS_ASSIGNED')
  const canViewUnassigned = hasPermission(session, 'VIEW_INCIDENTS_UNASSIGNED')
  
  // Absolute Zero-Trust Evaluation
  if (attachment.incident && !canViewAll && !canViewAssigned && !canViewUnassigned) {
     return { error: "Forbidden: Absolute Zero-Trust. You lack baseline view clearance to operate on this dataset." }
  }

  if (attachment.vuln && !hasPermission(session, 'VIEW_VULNERABILITIES')) {
     return { error: "Forbidden: Absolute Zero-Trust. You lack baseline view clearance to operate on this dataset." }
  }

  if (attachment.incident && !hasIncidentDeletePrivilege && attachment.uploaderId !== session.user.id) {
     return { error: "Forbidden: You cannot delete incident evidence you did not upload." }
  }

  if (attachment.vuln && !hasVulnDeletePrivilege && attachment.uploaderId !== session.user.id) {
     return { error: "Forbidden: You cannot delete vulnerability evidence you did not upload." }
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

  const { fireHook } = await import("@/lib/plugins/hook-engine");
  await fireHook("onEvidenceDestroyed", attachmentId);


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
    revalidatePath(`/incidents/${attachment.incidentId}`)
    revalidatePath(`/incidents/[id]`, 'page')
  }

  if (attachment.vulnId) {
    revalidatePath(`/vulnerabilities/${attachment.vulnId}`)
    revalidatePath(`/vulnerabilities/[id]`, 'page')
  }

  return { success: true }
}
