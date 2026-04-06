import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { ReadableOptions } from "stream"

import { Readable } from "stream"

function bufferToReadableStream(nodeStream: fs.ReadStream) {
  // Convert Node.js optimized stream directly into Web standard ReadableStream chunk stream
  return Readable.toWeb(nodeStream) as any;
}

function getContentType(filename: string) {
  const ext = path.extname(filename).toLowerCase()
  switch (ext) {
    case '.png': return 'image/png'
    case '.jpg':
    case '.jpeg': return 'image/jpeg'
    case '.gif': return 'image/gif'
    case '.pdf': return 'application/pdf'
    case '.csv': return 'text/csv'
    case '.zip': return 'application/zip'
    case '.json': return 'application/json'
    case '.txt':
    case '.log': return 'text/plain'
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    default: return 'application/octet-stream'
  }
}

export async function GET(req: Request, props: { params: Promise<{ filename: string }> }) {
  const params = await props.params;
  const session = await auth()
  
  // Unauthenticated users are totally blocked
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { filename } = params
  if (!filename) return new NextResponse("Bad Request", { status: 400 })

  // Find the attachment in the DB by filename (contained in fileUrl)
  // Because fileUrl is `/api/files/${safeFilename}`
  const fileUrl = `/api/files/${filename}`
  
  const attachment = await db.attachment.findFirst({
    where: { fileUrl },
    include: {
      incident: { select: { reporterId: true, assignees: { select: { id: true } } } },
      vuln: { select: { id: true } }
    }
  })

  if (!attachment) {
    return new NextResponse("File Not Found", { status: 404 })
  }

  const hasPrivilege = session.user.roles.includes('ADMIN') || session.user.roles.includes('SECOPS')

  // Enforce Bound Object Level Authorization
  if (!hasPrivilege) {
    if (attachment.uploaderId !== session.user.id) {
       // If it belongs to an incident
       if (attachment.incident) {
          const isReporter = attachment.incident.reporterId === session.user.id
          const isAssigned = attachment.incident.assignees.some(a => a.id === session.user.id)
          if (!isReporter && !isAssigned) {
             return new NextResponse("Forbidden: Strict BOLA boundaries restrict access to this file.", { status: 403 })
          }
       } else {
          // If it is detached or belongs to a vuln, and they are not ADMIN/SECOPS or uploader -> Deny
          return new NextResponse("Forbidden: Access Denied.", { status: 403 })
       }
    }
  }

  const safeBase = path.resolve(process.cwd(), 'private', 'uploads')
  const filePath = path.resolve(safeBase, filename)

  if (!filePath.startsWith(safeBase)) {
    return new NextResponse("Physical file missing", { status: 404 })
  }

  try {
    // Mitigate O(N) Memory Exhaustion by allocating native micro-buffers (Chunk Streaming)
    const nodeStream = fs.createReadStream(filePath)
    const stream = bufferToReadableStream(nodeStream)
    const contentType = getContentType(filename)

    return new NextResponse(stream, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': `inline; filename="${attachment.filename}"`
      }
    })
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return new NextResponse("Physical file missing", { status: 404 })
    }
    console.error("Error reading file:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
