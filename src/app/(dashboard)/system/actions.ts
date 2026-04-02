"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { Role } from "@prisma/client"

export async function updateSystemSettings(formData: FormData) {
  const session = await auth()
  if (!session?.user || !session.user.roles.includes('ADMIN')) {
    throw new Error("Unauthorized")
  }

  // base-ui Checkbox with name="allowRegistration" will send "on" if checked, otherwise it won't be in formData
  const allowRegistration = formData.get("allowRegistration") === "on"
  const requireGlobal2FA = formData.get("requireGlobal2FA") === "on"
  const defaultUserRolesRaw = formData.getAll("defaultUserRoles") as any[]
  const defaultUserRoles = defaultUserRolesRaw.length > 0 ? defaultUserRolesRaw : ["REPORTER"]

  const webhookEnabled = formData.get("webhookEnabled") === "on"
  const webhookUrl = formData.get("webhookUrl") as string || ""

  const slaCriticalHours = parseInt(formData.get("slaCriticalHours") as string || "4", 10)
  const slaHighHours = parseInt(formData.get("slaHighHours") as string || "24", 10)
  const slaMediumHours = parseInt(formData.get("slaMediumHours") as string || "72", 10)
  const slaLowHours = parseInt(formData.get("slaLowHours") as string || "168", 10)

  // Rate Limiting Config
  const rateLimitEnabled = formData.get("rateLimitEnabled") === "on"
  const rateLimitWindowMs = parseInt(formData.get("rateLimitWindowMs") as string || "900000", 10)
  const rateLimitMaxAttempts = parseInt(formData.get("rateLimitMaxAttempts") as string || "5", 10)

  await db.systemSetting.upsert({
    where: { id: "global" },
    update: {
      allowRegistration,
      requireGlobal2FA,
      webhookEnabled,
      webhookUrl,
      defaultUserRoles,
      slaCriticalHours,
      slaHighHours,
      slaMediumHours,
      slaLowHours,
      rateLimitEnabled,
      rateLimitWindowMs,
      rateLimitMaxAttempts
    },
    create: {
      id: "global",
      allowRegistration,
      requireGlobal2FA,
      webhookEnabled,
      webhookUrl,
      defaultUserRoles,
      slaCriticalHours,
      slaHighHours,
      slaMediumHours,
      slaLowHours,
      rateLimitEnabled,
      rateLimitWindowMs,
      rateLimitMaxAttempts
    }
  })

  revalidatePath("/system")
}
