"use server"

import { db } from "@/lib/db"
import bcrypt from "bcrypt"
import { redirect } from "next/navigation"

export async function attemptRegistration(prevState: any, formData: FormData) {
  const settings = await db.systemSetting.findUnique({ where: { id: "global" } })
  const allowRegistration = settings?.allowRegistration ?? true

  if (!allowRegistration) {
     return "REGISTRATION_DISABLED"
  }

  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password || !name) {
    return "MISSING_FIELDS"
  }
  
  if (password.length < 8) {
    return "PASSWORD_TOO_SHORT"
  }

  // Anti-bruteforce / Anti-enumeration delay (Constant time mitigation)
  // Regardless of success or failure, we artificially delay the response.
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));

  const existingUser = await db.user.findUnique({ where: { email } })
  if (existingUser) {
    // SECURITY: To prevent Account Enumeration, we pretend it succeeded,
    // or return a generic error. Standard best practice: Return generic error.
    return "REGISTRATION_FAILED"
  }

  const passwordHash = await bcrypt.hash(password, 10)
  
  // Bootstrap logic: If this is the absolute first user on the system, make them ADMIN
  const totalUsers = await db.user.count()
  let assignedRole = settings?.defaultUserRole ?? "REPORTER"
  
  if (totalUsers === 0) {
    assignedRole = "ADMIN"
  }
  
  await db.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: assignedRole
    }
  })

  redirect("/login?registered=true")
}
