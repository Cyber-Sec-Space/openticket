
jest.mock("../src/lib/settings", () => ({
  getGlobalSettings: jest.fn(),
  invalidateGlobalSettings: jest.fn()
}));
import { getGlobalSettings } from "../src/lib/settings";
jest.mock("isomorphic-dompurify", () => ({
  sanitize: (str) => str
}));
import { fireHook, invalidateHookCache } from "../src/lib/plugins/hook-engine"
import { db } from "../src/lib/db"

jest.mock("isolated-vm", () => {
  return {
    Isolate: class {
      constructor(options: any) {}
      createContextSync() {
        const globalStore: any = {};
        return {
          global: {
            setSync: (key: string, val: any) => {
              // Extract the value from Reference if it is one
              globalStore[key] = val && val.val ? val.val : val;
            },
            derefInto: jest.fn(),
            _getStore: () => globalStore
          }
        }
      }
      compileScriptSync(code: string) {
        return {
          run: async (context: any, options: any) => {
             const store = context.global._getStore();
             // Extract the wrapper from the global object and run it so the hook executes
             if (store && typeof store._hostWrapper === 'function') {
                // If there is a timeout expected from a hanging promise, simulate it
                // by running the hook, and if it doesn't resolve within timeout, throw
                const hookPromise = store._hostWrapper();
                if (options.timeout) {
                  const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error("Execution Timeout: Plugin exceeded the 5000ms sandbox time-bomb limit.")), options.timeout);
                  });
                  return Promise.race([hookPromise, timeoutPromise]);
                }
                return hookPromise;
             }
             return Promise.resolve();
          }
        }
      }
    },
    Reference: class {
      constructor(public val: any) {}
    },
    ExternalCopy: class {
      constructor(public val: any) {}
      copyInto() { return this.val; }
    }
  };
});

jest.mock("../src/lib/db", () => ({
  db: {
    pluginState: {
      findMany: jest.fn(),
    },
    systemSetting: {
      findFirst: jest.fn().mockResolvedValue({ systemPlatformUrl: "http://localhost:3000" }),
    }
  }
}))

jest.mock("@/plugins", () => ({
  activePlugins: [
    {
      manifest: { id: "test", name: "test-plugin" },
      hooks: {
        onSystemSettingsUpdated: jest.fn().mockResolvedValue(true)
      }
    }
  ]
}))

jest.mock("../src/lib/plugins/sdk-context", () => ({
  createPluginContext: jest.fn().mockResolvedValue({})
}))

jest.mock("../src/lib/plugins/crypto", () => ({
  parsePluginConfig: jest.fn().mockReturnValue({})
}))

describe("Hook Engine", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    invalidateHookCache()
    global.fetch = jest.fn() as any
  })

  it("handles empty db states", async () => {
    (db.pluginState.findMany as jest.Mock).mockResolvedValue([])
    await fireHook("onSystemSettingsUpdated", {} as any)
    const { activePlugins } = require("@/plugins")
    expect(activePlugins[0].hooks.onSystemSettingsUpdated).not.toHaveBeenCalled()
  })
  
  it("handles db query failure silently creating empty cache", async () => {
    (db.pluginState.findMany as jest.Mock).mockRejectedValue(new Error("DB DOWN"))
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    await fireHook("onSystemSettingsUpdated", {} as any)
    
    expect(consoleSpy).toHaveBeenCalledWith("[Plugin Core] Failed to query PluginState from DB.", expect.any(Error))
    consoleSpy.mockRestore()
  })

  it("fires hook if plugin active", async () => {
    (db.pluginState.findMany as jest.Mock).mockResolvedValue([{ id: "test", isActive: true, configJson: null }])
    await fireHook("onSystemSettingsUpdated", {} as any)
    const { activePlugins } = require("@/plugins")
    expect(activePlugins[0].hooks.onSystemSettingsUpdated).toHaveBeenCalled()
  })
  
  it("skips firing hook if sourcePluginId matches", async () => {
    (db.pluginState.findMany as jest.Mock).mockResolvedValue([{ id: "test", isActive: true, configJson: null }])
    await fireHook("onSystemSettingsUpdated", {} as any, "test")
    const { activePlugins } = require("@/plugins")
    expect(activePlugins[0].hooks.onSystemSettingsUpdated).not.toHaveBeenCalled()
  })

  it("catches errors within the hook execution", async () => {
    (db.pluginState.findMany as jest.Mock).mockResolvedValue([{ id: "test", isActive: true }])
    
    const { activePlugins } = require("@/plugins")
    activePlugins[0].hooks.onSystemSettingsUpdated = jest.fn().mockRejectedValue(new Error("Hook failed"))
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    await fireHook("onSystemSettingsUpdated", {} as any)
    
    expect(consoleSpy).toHaveBeenCalledWith(`[Plugin Core] Trigger logic failure in plugin [test] on event [onSystemSettingsUpdated]:`, expect.any(Error))
    consoleSpy.mockRestore()
  })

  it("handles parse errors in config configJson", async () => {
    (db.pluginState.findMany as jest.Mock).mockResolvedValue([{ id: "test", isActive: true, configJson: "enc.v1.boom" }])
    const { parsePluginConfig } = require("../src/lib/plugins/crypto");
    parsePluginConfig.mockImplementationOnce(() => { throw new Error("bad format") });

    await fireHook("onSystemSettingsUpdated", {} as any)
    const { activePlugins } = require("@/plugins")
    expect(activePlugins[0].hooks.onSystemSettingsUpdated).toHaveBeenCalled()
  })

  it("rejects timeout cleanly via Time-Bomb sandbox", async () => {
    // Override setTimeout locally to force the timeout failure branch directly
    global.setTimeout = jest.fn((cb) => cb()) as any;
    (db.pluginState.findMany as jest.Mock).mockResolvedValue([{ id: "test", isActive: true }])
    
    const { activePlugins } = require("@/plugins")
    activePlugins[0].hooks.onSystemSettingsUpdated = jest.fn(() => new Promise(() => {})) // Hanging hook
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    await fireHook("onSystemSettingsUpdated", {} as any)
    
    expect(consoleSpy).toHaveBeenCalledWith(`[Plugin Core] Trigger logic failure in plugin [test] on event [onSystemSettingsUpdated]:`, expect.objectContaining({ message: expect.stringMatching(/timeout|timed out/i) }))
    consoleSpy.mockRestore()
  })
})
