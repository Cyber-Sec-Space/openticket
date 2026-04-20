import { createAssetApi } from "@/lib/plugins/sdk-assets";
import { db } from "@/lib/db";
import { PluginSystemError } from "@/lib/plugins/errors";

jest.mock("@/lib/db", () => ({
  db: {
    asset: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn().mockImplementation(async (arr) => Promise.all(arr))
  }
}));

describe("sdk-assets", () => {
  let ctx: any;
  beforeEach(() => {
    jest.clearAllMocks();
    ctx = {
      pluginId: "test-plugin",
      requireBotUser: jest.fn().mockReturnValue("bot-id"),
      triggerHook: jest.fn().mockResolvedValue(true)
    };
  });

  const api = () => createAssetApi(ctx);

  describe("createAsset", () => {
    it("creates an asset", async () => {
      (db.asset.create as jest.Mock).mockResolvedValue({ id: "a1" });
      const res = await api().createAsset("Test Asset", "HARDWARE", "127.0.0.1", "ext-1", { foo: "bar" });
      
      expect(res).toEqual({ id: "a1" });
      expect(db.asset.create).toHaveBeenCalled();
      expect(db.auditLog.create).toHaveBeenCalled();
      expect(ctx.triggerHook).toHaveBeenCalledWith("onAssetCreated", { id: "a1" });
    });
  });

  describe("getAsset", () => {
    it("gets asset by ID", async () => {
      (db.asset.findUnique as jest.Mock).mockResolvedValue({ id: "a1" });
      const res = await api().getAsset("a1");
      expect(res).toEqual({ id: "a1" });
    });
  });

  describe("getAssetByIp", () => {
    it("gets asset by IP", async () => {
      (db.asset.findFirst as jest.Mock).mockResolvedValue({ id: "a1" });
      const res = await api().getAssetByIp("127.0.0.1");
      expect(res).toEqual({ id: "a1" });
    });
  });

  describe("getAssetByIdentifier", () => {
    it("gets asset by Identifier", async () => {
      (db.asset.findFirst as jest.Mock).mockResolvedValue({ id: "a1" });
      const res = await api().getAssetByIdentifier("ext-1");
      expect(res).toEqual({ id: "a1" });
    });
  });

  describe("searchAssets", () => {
    it("searches assets with no conditions", async () => {
      (db.asset.findMany as jest.Mock).mockResolvedValue([{ id: "a1" }]);
      const res = await api().searchAssets();
      expect(res).toEqual([{ id: "a1" }]);
      expect(db.asset.findMany).toHaveBeenCalled();
    });

    it("searches assets with type and status", async () => {
      (db.asset.findMany as jest.Mock).mockResolvedValue([{ id: "a1" }]);
      const res = await api().searchAssets({ type: "HARDWARE", status: "ONLINE", limit: 10 });
      expect(res).toEqual([{ id: "a1" }]);
      expect(db.asset.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { type: "HARDWARE", status: "ONLINE" }
      }));
    });

    it("searches assets with only type", async () => {
      (db.asset.findMany as jest.Mock).mockResolvedValue([{ id: "a1" }]);
      await api().searchAssets({ type: "SOFTWARE" });
      expect(db.asset.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { type: "SOFTWARE" }
      }));
    });

    it("searches assets with only status", async () => {
      (db.asset.findMany as jest.Mock).mockResolvedValue([{ id: "a1" }]);
      await api().searchAssets({ status: "ONLINE" });
      expect(db.asset.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { status: "ONLINE" }
      }));
    });
  });

  describe("updateAssetDetails", () => {
    it("updates asset details", async () => {
      (db.asset.update as jest.Mock).mockResolvedValue({ id: "a1" });
      await api().updateAssetDetails("a1", { name: "New Name", type: "SOFTWARE", ipAddress: "192.168.1.1", externalId: "ext-2" });
      expect(db.asset.update).toHaveBeenCalled();
      expect(ctx.triggerHook).toHaveBeenCalledWith("onAssetUpdated", { id: "a1" });
    });
  });

  describe("updateAssetStatus", () => {
    it("updates asset status", async () => {
      (db.asset.update as jest.Mock).mockResolvedValue({ id: "a1" });
      await api().updateAssetStatus("a1", "OFFLINE");
      expect(db.asset.update).toHaveBeenCalled();
    });
  });

  describe("updateAssetMetadata", () => {
    it("throws if asset not found", async () => {
      (db.asset.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(api().updateAssetMetadata("a1", { patch: true })).rejects.toThrow(PluginSystemError);
    });

    it("patches asset metadata", async () => {
      (db.asset.findUnique as jest.Mock).mockResolvedValue({ id: "a1", metadata: { exist: true } });
      (db.asset.update as jest.Mock).mockResolvedValue({ id: "a1" });
      await api().updateAssetMetadata("a1", { patch: true });
      expect(db.asset.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { metadata: { exist: true, patch: true } }
      }));
    });
  });

  describe("deleteAsset", () => {
    it("deletes asset", async () => {
      (db.asset.delete as jest.Mock).mockResolvedValue({ id: "a1" });
      await api().deleteAsset("a1");
      expect(db.asset.delete).toHaveBeenCalled();
      expect(ctx.triggerHook).toHaveBeenCalledWith("onAssetDestroyed", "a1");
    });
  });
});
