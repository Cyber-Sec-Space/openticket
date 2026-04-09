import { fireHook } from "../src/lib/plugins/hook-engine";
import { activePlugins } from "../src/plugins";
import { OpenTicketPlugin } from "../src/lib/plugins/types";

jest.mock("../src/lib/db", () => ({
  db: {
    pluginState: {
      findMany: jest.fn().mockResolvedValue([
        { id: "test", isActive: true },
        { id: "bad", isActive: true },
        { id: "good", isActive: true },
        { id: "test2", isActive: true },
        { id: "test3", isActive: true },
        { id: "testConfig", isActive: true, configJson: `{"key":"value"}` },
        { id: "testConfigBad", isActive: true, configJson: `"{bad}` },
      ])
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: "system_bot", customRoles: [] }),
      update: jest.fn()
    }
  }
}));

// Mock the activePlugins array
jest.mock("../src/plugins", () => ({
  activePlugins: []
}));

describe("Hook Engine", () => {
  beforeEach(() => {
    // Clear out plugins and mocks
    activePlugins.length = 0;
    jest.clearAllMocks();
  });

  it("should trigger hooks on registered plugins", async () => {
    const mockOnIncidentCreated = jest.fn().mockResolvedValue(undefined);
    const mockOnAssetCompromise = jest.fn().mockResolvedValue(undefined);

    const testPlugin: OpenTicketPlugin = {
      manifest: {
        id: "test", name: "test", description: "test", version: "1"
      },
      hooks: {
        onIncidentCreated: mockOnIncidentCreated,
        onAssetCompromise: mockOnAssetCompromise
      }
    };

    activePlugins.push(testPlugin);

    const dummyIncident = { id: "123", severity: "CRITICAL" } as any;
    
    await fireHook("onIncidentCreated", dummyIncident);

    expect(mockOnIncidentCreated).toHaveBeenCalledWith(dummyIncident, {}, expect.any(Object));
    expect(mockOnAssetCompromise).not.toHaveBeenCalled();
  });

  it("should isolate plugin hook failures", async () => {
    // If one plugin throws, the other should still execute successfully without tanking the whole bus
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const mockSuccess = jest.fn().mockResolvedValue(undefined);
    const mockFail = jest.fn().mockRejectedValue(new Error("Boom"));

    const badPlugin: OpenTicketPlugin = {
      manifest: { id: "bad", name: "bad", description: "bad", version: "1" },
      hooks: { onIncidentCreated: mockFail }
    };

    const goodPlugin: OpenTicketPlugin = {
      manifest: { id: "good", name: "good", description: "good", version: "1" },
      hooks: { onIncidentCreated: mockSuccess }
    };

    activePlugins.push(badPlugin, goodPlugin);

    await fireHook("onIncidentCreated", { id: "test" } as any);

    expect(mockFail).toHaveBeenCalled();
    expect(mockSuccess).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Plugin Core] Trigger failure"),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it("should skip running hooks if the plugin does not expose the event", async () => {
    const testPlugin: OpenTicketPlugin = {
      manifest: { id: "test2", name: "test2", description: "", version: "" },
      hooks: {} // no hooks defined
    };
    activePlugins.push(testPlugin);

    await expect(fireHook("onIncidentResolved", {} as any)).resolves.not.toThrow();
  });

  it("should handle plugins with no hooks object at all", async () => {
    const testPlugin: OpenTicketPlugin = {
      manifest: { id: "test3", name: "test3", description: "", version: "" }
    };
    activePlugins.push(testPlugin);

    await expect(fireHook("onIncidentCreated", {} as any)).resolves.not.toThrow();
  });

  it("should successfully parse valid config and gracefully catch malformed JSON configs", async () => {
    const mockOnIncidentCreatedGood = jest.fn().mockResolvedValue(undefined);
    const mockOnIncidentCreatedBadJSON = jest.fn().mockResolvedValue(undefined);

    activePlugins.push({
      manifest: { id: "testConfig", name: "test", description: "", version: "" },
      hooks: { onIncidentCreated: mockOnIncidentCreatedGood }
    });
    activePlugins.push({
      manifest: { id: "testConfigBad", name: "badjson", description: "", version: "" },
      hooks: { onIncidentCreated: mockOnIncidentCreatedBadJSON }
    });

    await fireHook("onIncidentCreated", {} as any);

    expect(mockOnIncidentCreatedGood).toHaveBeenCalledWith({}, { key: "value" }, expect.any(Object));
    expect(mockOnIncidentCreatedBadJSON).toHaveBeenCalledWith({}, {}, expect.any(Object));
  });

  it("should catch db.pluginState findMany errors natively without explosive disruption", async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { db } = require("../src/lib/db");
    const { invalidateHookCache } = require("../src/lib/plugins/hook-engine");
    
    // Simulate DB offline
    (db.pluginState.findMany as jest.Mock).mockRejectedValueOnce(new Error("DB Connection Lost"));

    const mockOnIncidentCreated = jest.fn().mockResolvedValue(undefined);
    activePlugins.push({
      manifest: { id: "test", name: "test", description: "", version: "" },
      hooks: { onIncidentCreated: mockOnIncidentCreated }
    });

    invalidateHookCache();
    await fireHook("onIncidentCreated", {} as any);
    
    // Engine will continue but uses empty dbState array
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Plugin Core] Failed to query PluginState from DB."),
      expect.any(Error)
    );
    expect(mockOnIncidentCreated).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
