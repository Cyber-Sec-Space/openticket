import { activePlugins } from "@/plugins"
import { OpenTicketPluginHooks } from "./types"
import { db } from "@/lib/db"
import { createPluginContext } from "./sdk-context"

export async function fireHook<K extends keyof OpenTicketPluginHooks>(
  event: K,
  payload: Parameters<NonNullable<OpenTicketPluginHooks[K]>>[0]
): Promise<void> {
  const promises = []

  // Pre-load all database toggles for plugins to prevent DB thundering herd
  let dbStates: any[] = [];
  try {
    dbStates = await db.pluginState.findMany();
  } catch (err) {
    console.error("[Plugin Core] Failed to query PluginState from DB.", err);
  }

  for (const plugin of activePlugins) {
    const state = dbStates.find(s => s.id === plugin.manifest.id)
    if (!state || !state.isActive) continue; // Skip if offline in DB

    if (plugin.hooks && plugin.hooks[event]) {
      const hookFn = plugin.hooks[event] as any
      // Parse configuration
      let config = {}
      if (state.configJson) {
         try { config = JSON.parse(state.configJson) } catch (e) {}
      }

      promises.push(
        (async () => {
          try {
            const context = await createPluginContext(plugin.manifest.id, plugin.manifest.name)
            await hookFn(payload, config, context)
          } catch (error) {
            console.error(`[Plugin Core] Trigger failure in plugin [${plugin.manifest.id}] on event [${event}]:`, error)
          }
        })()
      )
    }
  }

  // Fire structurally parallel
  await Promise.allSettled(promises)
}
