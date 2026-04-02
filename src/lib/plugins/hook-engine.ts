import { activePlugins } from "@/plugins"
import { OpenTicketPluginHooks } from "./types"

export async function fireHook<K extends keyof OpenTicketPluginHooks>(
  event: K,
  payload: Parameters<NonNullable<OpenTicketPluginHooks[K]>>[0]
): Promise<void> {
  const promises = []

  for (const plugin of activePlugins) {
    if (plugin.hooks && plugin.hooks[event]) {
      // Safely queue execution
      const hookFn = plugin.hooks[event] as any
      promises.push(
        (async () => {
          try {
            await hookFn(payload)
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
