"use server"

import { auth, update } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import * as OTPAuth from "otpauth"
import { assertSecureSession } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"
import bcrypt from "bcrypt"


export async function updateProfile(formData: FormData) {
  const session = await auth()
  assertSecureSession(session)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const name = formData.get("name") as string

  if (!name || name.trim() === "") {
    throw new Error("Display name cannot be structurally barren.")
  }

  const updatedUser = await db.user.update({
    where: { id: session.user.id },
    data: { name: name.trim() }
  })
  
  await db.auditLog.create({
    data: {
      action: "UPDATE",
      entityType: "USER",
      entityId: session.user.id,
      userId: session.user.id,
      changes: { details: "User updated their display profile." }
    }
  })

  const { fireHook } = await import("@/lib/plugins/hook-engine")
  await fireHook("onUserUpdated", updatedUser as any)


  redirect("/settings")
}

export async function generate2FA() {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) return { error: "Unauthorized" }

  const dbUser = await db.user.findUnique({ where: { id: session.user.id } })
  if (dbUser?.isTwoFactorEnabled) {
    return { error: "Protocol Aborted: 2FA is already active. It must be explicitly disabled via password authorization before re-generation." }
  }

  const baseSecret = new OTPAuth.Secret({ size: 20 })
  const secret = baseSecret.base32

  const totp = new OTPAuth.TOTP({
    issuer: "OpenTicket",
    label: session.user.email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: baseSecret
  })
  const otpauthUrl = totp.toString()

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
  
  if (user.isTwoFactorEnabled) {
    return { error: "Protocol Aborted: 2FA is already active." }
  }

  const totp = new OTPAuth.TOTP({ secret: user.twoFactorSecret, algorithm: 'SHA1', digits: 6, period: 30 })
  const isValid = totp.validate({ token, window: 1 }) !== null

  if (!isValid) {
    return { error: "Invalid TOTP Code provided. Synchronization failed." }
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { isTwoFactorEnabled: true }
  })
  
  await db.auditLog.create({
    data: {
      action: "UPDATE",
      entityType: "USER",
      entityId: session.user.id,
      userId: session.user.id,
      changes: { details: "Two-Factor Authentication (2FA) successfully enabled and verified." }
    }
  })

  if (session.user.requires2FASetup) {
    await update({ user: { requires2FASetup: false } }) // Flush Edge Middleware stale cache natively.
  }
  revalidatePath("/", "layout")
  return { success: true }
}

export async function disable2FA(password: string) {
  const session = await auth()
  assertSecureSession(session)
  if (!session?.user?.id) return { error: "Unauthorized" }

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user || !user.passwordHash) return { error: "Identity core missing." }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
  if (!isPasswordValid) return { error: "Authentication Thwarted: Cannot disable 2FA without strict origin confirmation." }

  await db.user.update({
    where: { id: session.user.id },
    data: { isTwoFactorEnabled: false, twoFactorSecret: null }
  })
  
  await db.auditLog.create({
    data: {
      action: "UPDATE",
      entityType: "USER",
      entityId: session.user.id,
      userId: session.user.id,
      changes: { details: "Two-Factor Authentication (2FA) disabled following password authorization." }
    }
  })

  revalidatePath("/settings")
  return { success: true }
}

export async function updateNotificationPreferences(prevState: any, formData: FormData) {
  const session = await auth()
  assertSecureSession(session)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const browserNotificationsEnabled = formData.get("browserNotificationsEnabled") === "true";
  const notifyOnCritical = formData.get("notifyOnCritical") === "on";
  const notifyOnHigh = formData.get("notifyOnHigh") === "on";
  const notifyOnAssign = formData.get("notifyOnAssign") === "on";
  const notifyOnResolution = formData.get("notifyOnResolution") === "on";
  const notifyOnAssetCompromise = formData.get("notifyOnAssetCompromise") === "on";
  const notifyOnUnassigned = formData.get("notifyOnUnassigned") === "on";

  await db.user.update({
    where: { id: session.user.id },
    data: {
      browserNotificationsEnabled,
      notifyOnCritical,
      notifyOnHigh,
      notifyOnAssign,
      notifyOnResolution,
      notifyOnAssetCompromise,
      notifyOnUnassigned
    }
  })

  await db.auditLog.create({
    data: {
      action: "UPDATE",
      entityType: "USER",
      entityId: session.user.id,
      userId: session.user.id,
      changes: { details: "User updated their notification preferences." }
    }
  })

  revalidatePath("/settings")
  return { success: true }
}
