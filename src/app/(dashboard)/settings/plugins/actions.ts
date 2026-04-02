"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function togglePluginState(pluginId: string, currentState: boolean) {
  const session = await auth();
  if (!session?.user?.id || !session.user.roles.includes("ADMIN")) {
    throw new Error("Unauthorized");
  }

  const newState = !currentState;
  await db.pluginState.upsert({
    where: { id: pluginId },
    update: { isActive: newState },
    create: { id: pluginId, isActive: newState, configJson: "{}" }
  });

  revalidatePath('/settings/plugins');
  revalidatePath('/settings/plugins/store');
}

export async function updatePluginConfig(pluginId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || !session.user.roles.includes("ADMIN")) {
    throw new Error("Unauthorized");
  }

  const state = await db.pluginState.findUnique({ where: { id: pluginId } });
  let config = {};
  
  if (state?.configJson) {
    try {
      config = JSON.parse(state.configJson);
    } catch (e) {
      console.error("Failed to parse plugin config json", e);
    }
  }

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) {
        // @ts-ignore
        config[key] = value;
    }
  }

  await db.pluginState.upsert({
    where: { id: pluginId },
    update: { configJson: JSON.stringify(config) },
    create: { id: pluginId, isActive: false, configJson: JSON.stringify(config) }
  });

  revalidatePath('/settings/plugins');
  revalidatePath('/settings/plugins/store');
}
