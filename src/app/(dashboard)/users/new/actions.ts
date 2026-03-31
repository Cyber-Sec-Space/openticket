"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"
import { Role } from "@prisma/client"

export async function createUserAction(formData: FormData) {
  const session = await auth()
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error("Forbidden: Strict Access Control")
  }

  const email = formData.get("email") as string
  const name = formData.get("name") as string
  const password = formData.get("password") as string
  const role = formData.get("role") as Role

  if (!email || !password || !name) {
    throw new Error("Validation structural error: missing foundational identity markers.")
  }

  // Check if user already exists
  const existingUser = await db.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    throw new Error(`Email proxy [${email}] is already bound to an active identity map.`)
  }

  // Execute 10-round salted hash
  const passwordHash = await bcrypt.hash(password, 10)

  const newUser = await db.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: role || Role.REPORTER
    }
  })

  // Telemetry Audit log hook
  await db.auditLog.create({
    data: {
      action: "USER_CREATED",
      entityType: "User",
      entityId: newUser.id,
      userId: session.user.id,
      changes: `Minted Identity record ${email} assigning Tier [${role}].`
    }
  })

  revalidatePath("/users")
  redirect("/users")
}
