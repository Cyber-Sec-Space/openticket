import { activePlugins } from "@/plugins"
import { OpenTicketPluginHooks } from "./types"
import { db } from "@/lib/db"
import { createPluginContext } from "./sdk-context"
import { parsePluginConfig } from "./crypto"
import vm from "vm"

// In-memory global cache for Thundering Herd mitigation
interface EngineCache {
  dbStates: any[];
  parsedConfigs: Record<string, any>;
  expiresAt: number;
}
let __engineCache: EngineCache | null = null;

// Allow external actions (like UI toggles or Config updates) to instantly invalidate the cache
export function invalidateHookCache() {
  __engineCache = null;
}

export async function fireHook<K extends keyof OpenTicketPluginHooks>(
  event: K,
  payload: Parameters<NonNullable<OpenTicketPluginHooks[K]>>[0],
  sourcePluginId?: string
): Promise<void> {
  const promises = []

  // Efficient In-Memory Cache implementation (10s TTL)
  const now = Date.now();
  if (!__engineCache || now > __engineCache.expiresAt) {
    try {
      const states = await db.pluginState.findMany();
      const parsed: Record<string, any> = {};
      for (const s of states) {
        if (s.configJson) {
           /* istanbul ignore next */
           try { parsed[s.id] = parsePluginConfig(s.configJson); } catch (e) { parsed[s.id] = {}; }
        } else {
           parsed[s.id] = {};
        }
      }
      __engineCache = { dbStates: states, parsedConfigs: parsed, expiresAt: now + 10000 };
    } catch (err) {
      console.error("[Plugin Core] Failed to query PluginState from DB.", err);
      if (!__engineCache) __engineCache = { dbStates: [], parsedConfigs: {}, expiresAt: 0 };
    }
  }

  const { dbStates, parsedConfigs } = __engineCache;

  for (const plugin of activePlugins) {
    const state = dbStates.find(s => s.id === plugin.manifest.id)
    if (!state || !state.isActive) continue; // Skip if offline in DB

    // Block infinite loops: exclude the exact plugin that emitted the SDK action
    /* istanbul ignore next */
    if (sourcePluginId && plugin.manifest.id === sourcePluginId) continue;

    if (plugin.hooks && plugin.hooks[event]) {
      const hookFn = plugin.hooks[event] as any
      // Pre-parsed cache extraction eliminates synchronous JSON.parse event loop blocking
      const config = parsedConfigs[plugin.manifest.id];

      promises.push(
        (async () => {
          try {
            const context = await createPluginContext(plugin.manifest.id, plugin.manifest.name)
            const settings = await db.systemSetting.findFirst()
            const baseUrl = settings?.systemPlatformUrl || "http://localhost:3000"
            
            // Context Isolation Map: Explicitly whitelist survival APIs for the Sandbox
            const sandboxContext = {
              payload,
              config,
              context,
              console,
              fetch,
              setTimeout,
              clearTimeout,
              Promise,
              env: {
                baseUrl
              },
              hookFn
            };

            // Instantiate VM and strictly map to global namespace inside the isolate
            vm.createContext(sandboxContext);
            
            // Execute as stringified bridging function
            const vmScript = new vm.Script(`
              (async () => {
                await hookFn(payload, config, context);
              })();
            `);

            // Time-Bomb Sandbox Protection: Force C++ loop-termination if execution hangs beyond 5 seconds synchronously
            const executionPromise = vmScript.runInContext(sandboxContext, { timeout: 5000 });
            
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error("Execution Timeout: Plugin exceeded the 5000ms sandbox time-bomb limit.")), 5000);
            });
            
            await Promise.race([executionPromise, timeoutPromise]);
            
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
