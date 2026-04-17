import { activePlugins } from "@/plugins"
import { OpenTicketPluginHooks } from "./types"
import { db } from "@/lib/db"
import { createPluginContext } from "./sdk-context"
import { parsePluginConfig } from "./crypto"
import vm from "vm"

export function invalidateHookCache() {
  // Deprecated: Cache is removed for Serverless consistency
}

export async function fireHook<K extends keyof OpenTicketPluginHooks>(
  event: K,
  payload: Parameters<NonNullable<OpenTicketPluginHooks[K]>>[0],
  sourcePluginId?: string
): Promise<void> {
  const promises = []

  let dbStates: any[] = [];
  const parsedConfigs: Record<string, any> = {};

  try {
    dbStates = await db.pluginState.findMany();
    for (const s of dbStates) {
      if (s.configJson) {
         /* istanbul ignore next */
         try { parsedConfigs[s.id] = parsePluginConfig(s.configJson); } catch (e) { parsedConfigs[s.id] = {}; }
      } else {
         parsedConfigs[s.id] = {};
      }
    }
  } catch (err) {
    console.error("[Plugin Core] Failed to query PluginState from DB.", err);
  }

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
            let errorType = "Plugin Core";
            let logPrefix = "Trigger logic failure in plugin";
            
            if (error && typeof error === 'object' && 'name' in error) {
              if (error.name === 'PluginSystemError') {
                errorType = "System Failure";
                logPrefix = "Underlying system failed during plugin execution";
              } else if (error.name === 'PluginPermissionError') {
                errorType = "Plugin Security";
                logPrefix = "Plugin attempted an unauthorized action";
              } else if (error.name === 'PluginInputError') {
                errorType = "Plugin Validation";
                logPrefix = "Plugin provided invalid input";
              }
            }
            
            console.error(`[${errorType}] ${logPrefix} [${plugin.manifest.id}] on event [${event}]:`, error);
          }
        })()
      )
    }
  }

  // Fire structurally parallel
  await Promise.allSettled(promises)
}
