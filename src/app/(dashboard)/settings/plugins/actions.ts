"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function togglePluginState(pluginId: string, currentState: boolean) {
  const session = await auth()
  if (!session?.user?.roles.includes("ADMIN")) throw new Error("Unauthorized: Admins only.");

  await db.pluginState.upsert({
    where: { id: pluginId },
    update: { isActive: !currentState },
    create: { id: pluginId, isActive: !currentState }
  })
  
  revalidatePath("/settings/plugins")
}

export async function updatePluginConfig(pluginId: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.roles.includes("ADMIN")) throw new Error("Unauthorized: Admins only.");

  const payload: Record<string, string> = {};
  formData.forEach((value, key) => {
    payload[key] = value.toString();
  });

  const configJson = JSON.stringify(payload);

  await db.pluginState.upsert({
    where: { id: pluginId },
    update: { configJson },
    create: { id: pluginId, configJson }
  })

  revalidatePath("/settings/plugins")
  return { success: true }
}
