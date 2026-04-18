
jest.mock("../src/lib/settings", () => ({
  getGlobalSettings: jest.fn(),
  invalidateGlobalSettings: jest.fn()
}));
import { getGlobalSettings } from "../src/lib/settings";
jest.mock("isomorphic-dompurify", () => ({
  sanitize: (str) => str
}));
import { togglePluginState, updatePluginConfig, installExternalPlugin, uninstallExternalPlugin, triggerProductionBuild, triggerServerRestart } from "../src/app/(dashboard)/settings/plugins/actions"
import { auth } from "@/auth"
import { hasPermission } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { encryptPluginConfig, parsePluginConfig } from "@/lib/plugins/crypto"
import { invalidateHookCache } from "@/lib/plugins/hook-engine"
import fs from "fs"
import path from "path"

jest.mock("@/auth", () => ({ auth: jest.fn() }))
jest.mock("@/lib/auth-utils", () => ({ hasPermission: jest.fn() }))
jest.mock("@/lib/db", () => ({
  db: {
    pluginState: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    }
  }
}))
jest.mock("@/lib/plugins/crypto", () => ({
  encryptPluginConfig: jest.fn((val) => "encrypted_" + JSON.stringify(val)),
  parsePluginConfig: jest.fn((val) => JSON.parse(val.replace("encrypted_", ""))),
}))
jest.mock("@/lib/plugins/hook-engine", () => ({ invalidateHookCache: jest.fn() }))
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))

jest.mock("fs", () => ({
  existsSync: jest.fn(),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
  }
}))

// Mock activePlugins directly
jest.mock("@/plugins", () => ({
  activePlugins: [
    { 
      manifest: { id: "test-plugin", name: "Test" },
      hooks: { onInstall: jest.fn(), onUninstall: jest.fn() }
    }
  ]
}))
jest.mock("@/lib/plugins/sdk-context", () => ({
  createPluginContext: jest.fn().mockResolvedValue({})
}))

jest.mock("child_process", () => ({
  exec: jest.fn((cmd, cb) => cb(null, { stdout: "ok" }))
}))

jest.mock("typescript", () => ({
  transpileModule: jest.fn(),
  DiagnosticCategory: { Error: 1 },
  JsxEmit: { ReactJSX: 1 }
}), { virtual: true })

describe("Plugin Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  describe("togglePluginState", () => {
    it("throws Unauthorized if not logged in", async () => {
      (auth as jest.Mock).mockResolvedValue(null)
      await expect(togglePluginState("test", true)).rejects.toThrow("Unauthorized")
    })

    it("toggles state and triggers lifecycle hooks", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      ;(db.pluginState.findUnique as jest.Mock).mockResolvedValue({ configJson: "encrypted_{}" })
      
      await togglePluginState("test-plugin", false) // toggle to true
      
      const { activePlugins } = require("@/plugins")
      expect(activePlugins[0].hooks.onInstall).toHaveBeenCalled()
      expect(db.pluginState.upsert).toHaveBeenCalled()
      expect(invalidateHookCache).toHaveBeenCalled()
    })
    
    it("toggles state to false and triggers onUninstall", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      
      await togglePluginState("test-plugin", true) // toggle to false
      
      const { activePlugins } = require("@/plugins")
      expect(activePlugins[0].hooks.onUninstall).toHaveBeenCalled()
    })

    it("throws if lifecycle hook fails with Error instance", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      ;(db.pluginState.findUnique as jest.Mock).mockResolvedValue({ id: "test-plugin", configJson: "enc.v1.xxx" })
      const crypto = require("../src/lib/plugins/crypto")
      jest.spyOn(crypto, "parsePluginConfig").mockReturnValue({ test: true })
      
      const { activePlugins } = require("@/plugins")
      activePlugins[0].hooks.onInstall.mockRejectedValueOnce(new Error("install hook failed"))
      
      await expect(togglePluginState("test-plugin", false)).rejects.toThrow("Plugin lifecycle initialization failed: install hook failed")
    })

    it("throws if lifecycle hook fails with generic string", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      ;(db.pluginState.findUnique as jest.Mock).mockResolvedValue({ id: "test-plugin", configJson: "enc.v1.xxx" })
      const crypto = require("../src/lib/plugins/crypto")
      jest.spyOn(crypto, "parsePluginConfig").mockReturnValue({ test: true })
      
      const { activePlugins } = require("@/plugins")
      activePlugins[0].hooks.onInstall.mockRejectedValueOnce("string error")
      
      await expect(togglePluginState("test-plugin", false)).rejects.toThrow("Plugin lifecycle initialization failed: string error")
    })

    it("toggles state when config json contains real data to test length branching", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      ;(db.pluginState.findUnique as jest.Mock).mockResolvedValue({ configJson: "encrypted_{\"key\":\"val\"}" })
      
      const crypto = require("../src/lib/plugins/crypto")
      jest.spyOn(crypto, "parsePluginConfig").mockReturnValue({ key: "val" })

      await togglePluginState("test-plugin", false)
      expect(db.pluginState.upsert).toHaveBeenCalled()
    })
  })

  describe("updatePluginConfig", () => {
    it("throws Unauthorized if lacks permission", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(false)
      await expect(updatePluginConfig("test", new FormData())).rejects.toThrow("Unauthorized")
    })

    it("updates config safely and filters prototype pollution", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      ;(db.pluginState.findUnique as jest.Mock).mockResolvedValue({ configJson: "encrypted_{\"old\":\"val\"}" })
      
      const fd = new FormData()
      fd.append("setting1", "val1")
      fd.append("__proto__", "pollution") // Should be ignored
      fd.append("$ACTION_ID", "123") // Should be ignored
      
      await updatePluginConfig("test-plugin", fd)
      
      expect(db.pluginState.upsert).toHaveBeenCalled()
      const upsertArgs = (db.pluginState.upsert as jest.Mock).mock.calls[0][0]
      expect(upsertArgs.update.configJson).toContain("val1")
      expect(upsertArgs.update.configJson).not.toContain("pollution")
    })
  })

  describe("installExternalPlugin", () => {
    it("throws Unauthorized if lacks permission", async () => {
      (auth as jest.Mock).mockResolvedValue(null)
      await expect(installExternalPlugin("id", "1.0", "registry")).rejects.toThrow("Unauthorized")
    })

    it("throws on invalid ID format", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      await expect(installExternalPlugin("../id", "1.0", "registry")).rejects.toThrow("Invalid plugin ID format")
    })

    it("throws on invalid version format", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      await expect(installExternalPlugin("id", "../1.0", "registry")).rejects.toThrow("Invalid version string format")
    })

    it("fetches source code, transpiles, and saves to file", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      
      const originalEnv = process.env.NODE_ENV
      ;(process.env as any).NODE_ENV = "production"
      
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => 'export const plugin = {};'
      })
      
      ;(fs.promises.readFile as jest.Mock).mockResolvedValue("export const activePlugins: OpenTicketPlugin[] = [\n];")
      
      const ts = require("typescript");
      ts.transpileModule.mockReturnValueOnce({
        diagnostics: []
      });
      
      await installExternalPlugin("new-plugin", "1.0", "registry")
      
      expect(fs.promises.writeFile).toHaveBeenCalledTimes(2) // Once for plugin source, once for index.ts
      ;(process.env as any).NODE_ENV = originalEnv
    })

    it("throws on structural AST error", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      
      const originalEnv = process.env.NODE_ENV
      ;(process.env as any).NODE_ENV = "production"
      
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => 'export const plugin = { /// invalid syntax }'
      })
      
      const ts = require("typescript");
      ts.transpileModule.mockReturnValueOnce({
        diagnostics: [{ category: 1, messageText: "syntax error" }]
      });
      
      await expect(installExternalPlugin("new-plugin", "1.0", "registry")).rejects.toThrow("critical structural syntax errors")
      ;(process.env as any).NODE_ENV = originalEnv
    })

    it("fetches from local file system if not in production", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      
      const originalEnv = process.env.NODE_ENV
      ;(process.env as any).NODE_ENV = "development"
      
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.promises.readFile as jest.Mock).mockResolvedValue("export const activePlugins: OpenTicketPlugin[] = [\n];")
      
      const ts = require("typescript");
      ts.transpileModule.mockReturnValueOnce({
        diagnostics: []
      });
      
      await installExternalPlugin("new-plugin", "1.0", "registry")
      
      expect(fs.promises.readFile).toHaveBeenCalled()
      ;(process.env as any).NODE_ENV = originalEnv
    })

    it("throws if index.ts structure is malformed", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      const originalEnv = process.env.NODE_ENV
      ;(process.env as any).NODE_ENV = "development"
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.promises.readFile as jest.Mock).mockResolvedValue("export const somethingElse = []")
      const ts = require("typescript");
      ts.transpileModule.mockReturnValueOnce({ diagnostics: [] });
      await expect(installExternalPlugin("new-plugin", "1.0", "registry")).rejects.toThrow("Failed to inject plugin: activePlugins array structure is malformed or missing.")
      ;(process.env as any).NODE_ENV = originalEnv
    })
    
    it("bypasses pre-flight if typescript fails internally with generic error", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      const originalEnv = process.env.NODE_ENV
      ;(process.env as any).NODE_ENV = "production"
      ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, text: async () => 'export const plugin = {}' })
      const ts = require("typescript");
      ts.transpileModule.mockImplementationOnce(() => { throw new Error("Could not initialize TS compiler"); });
      
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {})
      ;(fs.promises.readFile as jest.Mock).mockResolvedValue("export const activePlugins: OpenTicketPlugin[] = [\n];")
      
      await installExternalPlugin("new-plugin", "1.0", "registry")
      expect(consoleSpy).toHaveBeenCalledWith("[Plugin Pre-flight] TypeScript AST parser unavailable. Bypassing pre-flight validation.")
      ;(process.env as any).NODE_ENV = originalEnv
      consoleSpy.mockRestore()
    })
    
    it("throws on path traversal in install", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      const originalEnv = process.env.NODE_ENV
      ;(process.env as any).NODE_ENV = "production"
      
      ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, text: async () => 'export const plugin = {}' })
      const ts = require("typescript");
      ts.transpileModule.mockReturnValueOnce({ diagnostics: [] });
      
      const ogJoin = path.join
      ;(path.join as any) = jest.fn()
           .mockReturnValueOnce("/valid/pluginsDir") // pluginsDir
           .mockReturnValueOnce("/bad/path")         // pluginFile
      
      await expect(installExternalPlugin("new-plugin", "1.0", "registry")).rejects.toThrow("Path traversal boundaries violated.")
      
      ;(path.join as any) = ogJoin
      ;(process.env as any).NODE_ENV = originalEnv
    })

    it("bypasses pre-flight if typescript returns undefined diagnostics", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      const originalEnv = process.env.NODE_ENV
      ;(process.env as any).NODE_ENV = "production"
      
      ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, text: async () => 'export const plugin = {}' })
      const ts = require("typescript");
      ts.transpileModule.mockReturnValueOnce({}); // Missing diagnostics property
      
      await installExternalPlugin("new-plugin", "1.0", "registry")
      ;(process.env as any).NODE_ENV = originalEnv
    })

    it("throws if fetch fails with 404", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      const originalEnv = process.env.NODE_ENV
      ;(process.env as any).NODE_ENV = "production"
      
      ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 })
      await expect(installExternalPlugin("new-plugin", "1.0", "registry")).rejects.toThrow("Failed to download plugin source code from remote registry (HTTP 404).")
      
      ;(process.env as any).NODE_ENV = originalEnv
    })

    it("warns and falls back to remote if local file is missing", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      
      const originalEnv = process.env.NODE_ENV
      ;(process.env as any).NODE_ENV = "development"
      ;(fs.existsSync as jest.Mock).mockReturnValue(false)
      
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {})
      ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, text: async () => 'export const plugin = {}' })
      const ts = require("typescript");
      ts.transpileModule.mockReturnValueOnce({ diagnostics: [] });
      ;(fs.promises.readFile as jest.Mock).mockResolvedValue("export const activePlugins: OpenTicketPlugin[] = [\n];")
      
      await installExternalPlugin("new-plugin", "1.0", "registry")
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("Falling back to remote production registry"))
      consoleWarnSpy.mockRestore()
      ;(process.env as any).NODE_ENV = originalEnv
    })

    it("throws error if NPM is requested via UI", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      await expect(installExternalPlugin("new-plugin", "1.0", "npm", "pkgame")).rejects.toThrow("NPM dynamic installation via UI is currently restricted. Please use CLI.")
    })
  })

  describe("uninstallExternalPlugin", () => {
    it("throws Unauthorized if lacks permission", async () => {
      (auth as jest.Mock).mockResolvedValue(null)
      await expect(uninstallExternalPlugin("id")).rejects.toThrow("Unauthorized")
    })
    
    it("throws on path traversal in uninstall", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      const ogJoin = path.join
      ;(path.join as any) = jest.fn()
           .mockReturnValueOnce("/valid/pluginsDir")
           .mockReturnValueOnce("/bad/path")
      await expect(uninstallExternalPlugin("plugin-id")).rejects.toThrow("Path traversal boundaries violated.")
      ;(path.join as any) = ogJoin
    })
    it("deletes file and references if exists", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      ;(fs.existsSync as jest.Mock).mockReturnValue(true)
      ;(fs.promises.readFile as jest.Mock).mockResolvedValue(`
        import externalpluginguyPlugin from "./external-plugin-guy";
        export const activePlugins: OpenTicketPlugin[] = [
          externalpluginguyPlugin,
        ];
      `)
      
      await uninstallExternalPlugin("plugin-guy")
      
      expect(fs.promises.unlink).toHaveBeenCalled()
      expect(fs.promises.writeFile).toHaveBeenCalled()
      expect(db.pluginState.deleteMany).toHaveBeenCalled()
    })

    it("throws if file does not exist", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      ;(fs.existsSync as jest.Mock).mockReturnValue(false)
      
      await expect(uninstallExternalPlugin("plugin-guy")).rejects.toThrow("Plugin source file not found")
    })
    
    it("throws on invalid ID format", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      await expect(uninstallExternalPlugin("../id")).rejects.toThrow("Invalid plugin ID format")
    })
  })

  describe("triggerProductionBuild", () => {
    it("throws Unauthorized if lacks permission", async () => {
       (auth as jest.Mock).mockResolvedValue(null)
       await expect(triggerProductionBuild()).rejects.toThrow("Unauthorized")
    })

    it("bypasses if not production", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      
      const originalEnv = process.env.NODE_ENV
      ;(process.env as any).NODE_ENV = "development"
      
      const { exec } = require("child_process")
      await triggerProductionBuild()
      expect(exec).not.toHaveBeenCalled()
      
      ;(process.env as any).NODE_ENV = originalEnv
    })

    it("executes build if production", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      
      const originalEnv = process.env.NODE_ENV
      ;(process.env as any).NODE_ENV = "production"
      
      const { exec } = require("child_process")
      await triggerProductionBuild()
      expect(exec).toHaveBeenCalled()
      
      ;(process.env as any).NODE_ENV = originalEnv
    })
  })

  describe("triggerServerRestart", () => {
    it("throws Unauthorized if lacks permission", async () => {
       (auth as jest.Mock).mockResolvedValue(null)
       await expect(triggerServerRestart()).rejects.toThrow("Unauthorized")
    })

    it("bypasses if not production", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      
      const originalEnv = process.env.NODE_ENV
      ;(process.env as any).NODE_ENV = "development"
      
      const spyKill = jest.spyOn(process, "kill").mockImplementation(() => true)
      global.setTimeout = jest.fn() as any
      
      await triggerServerRestart()
      expect(global.setTimeout).not.toHaveBeenCalled()
      
      spyKill.mockRestore()
      ;(process.env as any).NODE_ENV = originalEnv
    })

    it("schedules kill if production", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } })
      ;(hasPermission as jest.Mock).mockReturnValue(true)
      
      const originalEnv = process.env.NODE_ENV
      ;(process.env as any).NODE_ENV = "production"
      
      global.setTimeout = jest.fn((cb) => cb()) as any
      const spyKill = jest.spyOn(process, "kill").mockImplementation(() => true)
      
      await triggerServerRestart()
      
      expect(spyKill).toHaveBeenCalledWith(process.pid, 'SIGKILL')
      
      spyKill.mockRestore()
      ;(process.env as any).NODE_ENV = originalEnv
    })
  })
})
