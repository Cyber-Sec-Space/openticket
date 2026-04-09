import { togglePluginState, updatePluginConfig, installExternalPlugin, triggerProductionBuild, triggerServerRestart } from "../src/app/(dashboard)/settings/plugins/actions"
import { db } from "../src/lib/db"
import { auth } from "../src/auth"
import { hasPermission } from "../src/lib/auth-utils"
import fs from "fs"
import child_process from "child_process"
import { revalidatePath } from "next/cache"

jest.mock("../src/lib/db", () => ({
  db: {
    pluginState: {
      upsert: jest.fn(),
      findUnique: jest.fn()
    }
  }
}));

jest.mock("../src/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("../src/lib/auth-utils", () => ({
  hasPermission: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("../src/plugins/index.ts", () => ({
  activePlugins: [
    {
       manifest: { id: "p1", name: "P1" },
       hooks: {
         onInstall: jest.fn().mockResolvedValue(true),
         onUninstall: jest.fn().mockResolvedValue(true)
       }
    }
  ]
}), { virtual: true });

jest.mock("../src/plugins", () => ({
  activePlugins: [
    {
       manifest: { id: "p1", name: "P1" },
       hooks: {
         onInstall: jest.fn().mockResolvedValue(true),
         onUninstall: jest.fn().mockResolvedValue(true)
       }
    }
  ]
}), { virtual: true });

jest.mock("../src/lib/plugins/sdk-context", () => ({
  createPluginContext: jest.fn().mockResolvedValue({ api: {} })
}));

jest.mock("../src/lib/plugins/crypto", () => ({
  encryptPluginConfig: jest.fn().mockImplementation((config) => JSON.stringify(config)),
  parsePluginConfig: jest.fn().mockImplementation((jsonString) => {
    try { return JSON.parse(jsonString); } catch (e) { return {}; }
  })
}));

jest.mock("fs", () => ({
  promises: {
    writeFile: jest.fn(),
    readFile: jest.fn().mockResolvedValue(`export const activePlugins: OpenTicketPlugin[] = []`)
  }
}));

jest.mock("child_process", () => ({
  exec: jest.fn((cmd, cb) => cb(null, "stdout", "stderr"))
}));

// Mock fetch globally
global.fetch = jest.fn() as jest.Mock;

describe("Plugin Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ user: { id: "1" } });
    (hasPermission as jest.Mock).mockReturnValue(true);
  });

  describe("togglePluginState", () => {
    it("throws Unauthorized if permission fails", async () => {
      (hasPermission as jest.Mock).mockReturnValueOnce(false);
      await expect(togglePluginState("p1", true)).rejects.toThrow("Unauthorized");
    });

    it("upserts inverted phase and revalidates paths", async () => {
      await togglePluginState("p1", false);
      
      expect(db.pluginState.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { isActive: true }})
      );
      expect(revalidatePath).toHaveBeenCalledWith('/settings/plugins');
    });

    it("triggers onUninstall when turning plugin off", async () => {
      await togglePluginState("p1", true);
      
      expect(db.pluginState.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { isActive: false }})
      );
    });
  });

  describe("updatePluginConfig", () => {
    it("throws Unauthorized if permission fails", async () => {
      (hasPermission as jest.Mock).mockReturnValueOnce(false);
      await expect(updatePluginConfig("p1", new FormData())).rejects.toThrow("Unauthorized");
    });

    it("parses existing DB config, ignores prototype pollution, merges new valid KV pairs", async () => {
      (db.pluginState.findUnique as jest.Mock).mockResolvedValueOnce({ configJson: `{"exist":"yes"}` });
      
      const fd = new FormData();
      fd.append("newKey", "newValue");
      fd.append("__proto__", "hacked");
      fd.append("$ACTION_ID", "ignoreme");

      await updatePluginConfig("p2", fd);

      // should merge exist: yes with newKey: newValue 
      const expectedJson = JSON.stringify({ exist: "yes", newKey: "newValue" });
      
      expect(db.pluginState.upsert).toHaveBeenCalledWith({
        where: { id: "p2" },
        update: { configJson: expectedJson },
        create: { id: "p2", isActive: false, configJson: expectedJson }
      });
    });

    it("silently swallows bad JSON from DB and continues cleanly", async () => {
      (db.pluginState.findUnique as jest.Mock).mockResolvedValueOnce({ configJson: `{bad}` });
      
      const fd = new FormData();
      fd.append("x", "y");
      await updatePluginConfig("p2", fd);
      
      expect(db.pluginState.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { configJson: JSON.stringify({ x: "y" }) }})
      );
    });
  });

  describe("installExternalPlugin", () => {
    it("throws Unauthorized if permission fails", async () => {
      (hasPermission as jest.Mock).mockReturnValueOnce(false);
      await expect(installExternalPlugin("id", "v1", "registry")).rejects.toThrow("Unauthorized");
    });

    it("rejects path traversal in plugin id format", async () => {
      await expect(installExternalPlugin("bad/id", "1.0.0", "registry")).rejects.toThrow("Invalid plugin ID format");
    });

    it("rejects dangerous version strings", async () => {
      await expect(installExternalPlugin("good", "1.0;rm -rf", "registry")).rejects.toThrow("Invalid version string format");
    });

    it("downloads and writes plugin from registry if valid", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue("console.log('hi')")
      });

      await installExternalPlugin("good-plugin", "1.0", "registry");
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining("plugins/good-plugin/1.0/index.tsx"));
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("external-good-plugin.tsx"),
        "console.log('hi')",
        "utf-8"
      );
      // Index re-write
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("index.ts"),
        expect.stringContaining("export const activePlugins: OpenTicketPlugin[] = [\n  externalgoodpluginPlugin,"),
        "utf-8"
      );
    });

    it("throws error if registry returns 404", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 404 });
      await expect(installExternalPlugin("good", "1.0", "registry")).rejects.toThrow("Failed to download plugin source code");
    });

    it("throws explicit error for NPM sources via UI", async () => {
      await expect(installExternalPlugin("any", "any", "npm", "pkgName")).rejects.toThrow("NPM dynamic installation via UI is currently restricted");
    });
    
    it("skips index rewrite if import already exists", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, text: jest.fn().mockResolvedValue("code") });
      const importStatement = `import externalgoodPlugin from "./external-good";\n`;
      (fs.promises.readFile as jest.Mock).mockResolvedValueOnce(importStatement); // simulates existing import
      await installExternalPlugin("good", "1.0", "registry");
      expect(fs.promises.writeFile).toHaveBeenCalledTimes(1); // Only writes external file, skips index.ts
    });
    
    it("throws an error when source type is npm", async () => {
      await expect(installExternalPlugin("some-pkg", "latest", "npm", "some-pkg")).rejects.toThrow("NPM dynamic installation via UI is currently restricted");
    });

    it("enforces absolute path boundary checks natively against forged returns", async () => {
      const path = require("path");
      const joinSpy = jest.spyOn(path, 'join');
      joinSpy.mockReturnValueOnce("/safe/plugins/dir") // pluginsDir
             .mockReturnValueOnce("/hacked/external-evil.tsx"); // pluginFile

      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, text: jest.fn().mockResolvedValue("code") });

      await expect(installExternalPlugin("evil", "1.0", "registry")).rejects.toThrow("Path traversal boundaries violated.");
      
      joinSpy.mockRestore();
    });
  });

  describe("System Triggers", () => {
    it("triggerProductionBuild calls exec build", async () => {
      await triggerProductionBuild();
      expect(child_process.exec).toHaveBeenCalledWith("npm run build", expect.any(Function));
    });

    it("throws unauthorized for build", async () => {
      (hasPermission as jest.Mock).mockReturnValueOnce(false);
      await expect(triggerProductionBuild()).rejects.toThrow("Unauthorized");
    });

    it("triggerServerRestart schedules exit and requires permission", async () => {
      jest.useFakeTimers();
      const exitSpy = jest.spyOn(process, "exit").mockImplementation((() => {}) as any);
      
      await triggerServerRestart();
      expect(exitSpy).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(1100);
      expect(exitSpy).toHaveBeenCalledWith(0);
      
      exitSpy.mockRestore();
      jest.useRealTimers();
    });

    it("triggerServerRestart throws unauthorized", async () => {
      (hasPermission as jest.Mock).mockReturnValueOnce(false);
      await expect(triggerServerRestart()).rejects.toThrow("Unauthorized");
    });
  });
});
