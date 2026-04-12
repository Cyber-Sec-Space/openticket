import { fireHook, invalidateHookCache } from "../src/lib/plugins/hook-engine"
import { db } from "../src/lib/db"

jest.mock("../src/lib/db", () => ({
  db: {
    pluginState: {
      findMany: jest.fn(),
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
    
    expect(consoleSpy).toHaveBeenCalledWith(`[Plugin Core] Trigger failure in plugin [test] on event [onSystemSettingsUpdated]:`, expect.any(Error))
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
    
    expect(consoleSpy).toHaveBeenCalledWith(`[Plugin Core] Trigger failure in plugin [test] on event [onSystemSettingsUpdated]:`, expect.objectContaining({ message: "Execution Timeout: Plugin exceeded the 5000ms sandbox time-bomb limit." }))
    consoleSpy.mockRestore()
  })
})
