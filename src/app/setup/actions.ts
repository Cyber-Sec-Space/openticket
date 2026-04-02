"use server"

import { db } from "@/lib/db"
import bcrypt from "bcrypt"
import { redirect } from "next/navigation"

export async function initializeInstance(formData: FormData) {
  // CRITICAL SECURITY FLIGHT CHECK: Is the database truly clean?
  const existingCount = await db.user.count()
  if (existingCount > 0) {
    throw new Error("System is already initialized. Cannot run bootstrap procedure.")
  }

  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (!name || !email || !password || password !== confirmPassword) {
    throw new Error("Invalid parameters provided or passwords do not match.")
  }

  const passwordHash = await bcrypt.hash(password, 12)

  // System Setup (Bootstrap first ADMIN and global system settings config)
  await db.$transaction([
    db.user.create({
      data: {
        name,
        email,
        passwordHash,
        roles: ["ADMIN"]
      }
    }),
    db.systemSetting.upsert({
      where: { id: "global" },
      update: {},
      create: {
        id: "global",
        allowRegistration: false,
        requireGlobal2FA: false
      }
    })
  ])

  // Successfully bootstrapped!
  redirect("/login")
}
