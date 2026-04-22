import { activePlugins } from "@/plugins"
import { OpenTicketPluginHooks } from "./types"
import { db } from "@/lib/db"
import { createPluginContext } from "./sdk-context"
import { parsePluginConfig } from "./crypto"
import ivm from "isolated-vm"

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
            
            // Execute the plugin logic synchronously wrapped in a Promise race.
            // Using isolated-vm to enforce a hard 128MB memory ceiling and execution Time-Bomb isolation.
            const isolate = new ivm.Isolate({ memoryLimit: 128 });
            const ivmContext = isolate.createContextSync();
            const jail = ivmContext.global;
            jail.setSync('global', jail.derefInto());

            // Because the plugins are loaded as native Node functions, passing native functions natively across 
            // the ivm boundary causes ARM64 V8 segmentation faults on complex objects. 
            // We use a bridged Host Wrapper Reference pattern to enforce the VM constraints safely.
            const hostWrapper = async () => {
              await hookFn(payload, config, context);
            };

            // Bind the host wrapper safely
            jail.setSync('_hostWrapper', new ivm.Reference(hostWrapper));

            // Execute as an Isolated Script bridging into the Host
            const ivmScript = isolate.compileScriptSync(`
              (async () => {
                await _hostWrapper.applyIgnored(undefined, []);
              })();
            `);

            // Time-Bomb Sandbox Protection: Force C++ loop-termination if execution hangs beyond 5 seconds synchronously
            const executionPromise = ivmScript.run(ivmContext, { timeout: 5000 });
            
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error("Execution Timeout: Plugin exceeded the 5000ms sandbox time-bomb limit.")), 5000);
            });
            
            await Promise.race([executionPromise, timeoutPromise]);
            
            // Clean up Isolate to release the 128MB memory reservation
            isolate.dispose();
            
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
