"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
// @ts-ignore
import { authenticator } from "otplib"
import { revalidatePath } from "next/cache"

export async function updateProfile(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const name = formData.get("name") as string

  if (!name || name.trim() === "") {
    throw new Error("Display name cannot be structurally barren.")
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { name: name.trim() }
  })

  redirect("/settings")
}

export async function generate2FA() {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) return { error: "Unauthorized" }

  const secret = authenticator.generateSecret()
  const otpauthUrl = authenticator.keyuri(session.user.email, "OpenTicket SecOps", secret)

  await db.user.update({
    where: { id: session.user.id },
    data: { twoFactorSecret: secret }
  })

  return { secret, otpauthUrl }
}

export async function verifyAndEnable2FA(token: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user || !user.twoFactorSecret) return { error: "No secret generated." }

  const isValid = authenticator.verify({ token, secret: user.twoFactorSecret })
  
  if (!isValid) {
    return { error: "Invalid TOTP Code provided. Synchronization failed." }
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { isTwoFactorEnabled: true }
  })

  revalidatePath("/settings")
  return { success: true }
}

export async function disable2FA() {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  await db.user.update({
    where: { id: session.user.id },
    data: { isTwoFactorEnabled: false, twoFactorSecret: null }
  })

  revalidatePath("/settings")
  return { success: true }
}
