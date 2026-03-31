"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"

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
