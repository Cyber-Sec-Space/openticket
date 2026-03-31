"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { Role } from "@prisma/client"

export async function updateSystemSettings(formData: FormData) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error("Unauthorized")
  }

  // base-ui Checkbox with name="allowRegistration" will send "on" if checked, otherwise it won't be in formData
  const allowRegistration = formData.get("allowRegistration") === "on"
  const requireGlobal2FA = formData.get("requireGlobal2FA") === "on"
  const defaultUserRole = (formData.get("defaultUserRole") as Role) || "REPORTER"

  await db.systemSetting.upsert({
    where: { id: "global" },
    update: {
      allowRegistration,
      requireGlobal2FA,
      defaultUserRole
    },
    create: {
      id: "global",
      allowRegistration,
      requireGlobal2FA,
      defaultUserRole
    }
  })

  revalidatePath("/system")
}
