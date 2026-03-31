"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { Severity } from "@prisma/client"

export async function createVulnerabilityAction(formData: FormData) {
  const session = await auth()
  
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SECOPS')) {
    throw new Error("Forbidden: Strict Access Control")
  }

  const title = formData.get("title") as string
  const cveId = formData.get("cveId") as string || null
  const description = formData.get("description") as string
  const severityStr = formData.get("severity") as string
  const severity = (severityStr || "LOW") as Severity
  
  const cvssScoreRaw = formData.get("cvssScore") as string
  const cvssScore = cvssScoreRaw ? parseFloat(cvssScoreRaw) : null

  const assetIds = formData.getAll("assetIds") as string[]

  if (!title || !description) {
    throw new Error("Validation structural error: missing foundational CVE markers.")
  }

  const newVuln = await db.vulnerability.create({
    data: {
      title,
      cveId,
      description,
      cvssScore,
      severity,
      affectedAssets: {
        connect: assetIds.map(id => ({ id }))
      }
    }
  })

  // Telemetry Audit log hook
  await db.auditLog.create({
    data: {
      action: "VULN_DISCOVERED",
      entityType: "Vulnerability",
      entityId: newVuln.id,
      userId: session.user.id,
      changes: `Minted Threat metrics ${cveId || newVuln.title} logging local CVSS:[${cvssScore}]`
    }
  })

  revalidatePath("/vulnerabilities")
  redirect("/vulnerabilities")
}
