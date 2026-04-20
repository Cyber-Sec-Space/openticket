import { createTelemetryApi } from "@/lib/plugins/sdk-telemetry";
import { db } from "@/lib/db";

jest.mock("@/lib/db", () => ({
  db: {
    userNotification: { create: jest.fn() },
    metricSnapshot: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    comment: { findUnique: jest.fn(), delete: jest.fn() },
    $transaction: jest.fn().mockImplementation(async (arr) => Promise.all(arr))
  }
}));

describe("sdk-telemetry", () => {
  let ctx: any;
  beforeEach(() => {
    jest.clearAllMocks();
    ctx = {
      pluginId: "test-plugin",
      requireBotUser: jest.fn().mockReturnValue("bot-id")
    };
  });

  const api = () => createTelemetryApi(ctx);

  describe("pushNotification", () => {
    it("creates a user notification", async () => {
      (db.userNotification.create as jest.Mock).mockResolvedValue({ id: "n-1" });
      const res = await api().pushNotification("user-1", "Title", "Body", "http://example.com");
      expect(res).toEqual({ id: "n-1" });
      expect(db.userNotification.create).toHaveBeenCalled();
    });
  });

  describe("logPluginMetric", () => {
    it("creates a metric snapshot", async () => {
      (db.metricSnapshot.create as jest.Mock).mockResolvedValue({ id: "m-1" });
      const res = await api().logPluginMetric("custom_metric", 42, { extra: "data" });
      expect(res).toEqual({ id: "m-1" });
      expect(db.metricSnapshot.create).toHaveBeenCalled();
    });

    it("truncates very large payloads", async () => {
      (db.metricSnapshot.create as jest.Mock).mockResolvedValue({ id: "m-1" });
      const hugeData = "A".repeat(6000);
      const res = await api().logPluginMetric("custom_metric", 42, { extra: hugeData });
      expect(res).toEqual({ id: "m-1" });
      expect(db.metricSnapshot.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ payload: expect.stringMatching(/^.{5000}$/) }) // exactly 5000 chars
      }));
    });

    it("silently catches errors", async () => {
      (db.metricSnapshot.create as jest.Mock).mockRejectedValue(new Error("DB Error"));
      const res = await api().logPluginMetric("custom_metric", 42);
      expect(res).toBeNull();
    });
  });

  describe("logAudit", () => {
    it("creates an audit log", async () => {
      (db.auditLog.create as jest.Mock).mockResolvedValue({ id: "audit-1" });
      const res = await api().logAudit("TEST_ACTION", "CustomEntity", "e-1", { val: 1 });
      expect(res).toEqual({ id: "audit-1" });
      expect(db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ action: "[PLUGIN:test-plugin] TEST_ACTION" })
      }));
    });

    it("handles missing/null changes gracefully", async () => {
      (db.auditLog.create as jest.Mock).mockResolvedValue({ id: "audit-1" });
      // @ts-ignore testing missing argument
      await api().logAudit("TEST_ACTION", "CustomEntity", "e-1");
      expect(db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ changes: {} })
      }));
    });

    it("does not duplicate plugin prefix if already present", async () => {
      (db.auditLog.create as jest.Mock).mockResolvedValue({ id: "audit-1" });
      await api().logAudit("[PLUGIN:test-plugin] TEST_ACTION", "CustomEntity", "e-1", { val: 1 });
      expect(db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ action: "[PLUGIN:test-plugin] TEST_ACTION" })
      }));
    });
  });

  describe("deleteComment", () => {
    it("returns null if comment does not exist", async () => {
      (db.comment.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await api().deleteComment("c-1");
      expect(res).toBeNull();
    });

    it("deletes own comment", async () => {
      (db.comment.findUnique as jest.Mock).mockResolvedValue({ id: "c-1", authorId: "bot-id" });
      (db.comment.delete as jest.Mock).mockResolvedValue({ id: "c-1" });
      await api().deleteComment("c-1");
      expect(db.comment.delete).toHaveBeenCalled();
    });

    it("requires DELETE_ANY_COMMENTS if deleting other comment", async () => {
      (db.comment.findUnique as jest.Mock).mockResolvedValue({ id: "c-1", authorId: "other-user" });
      (db.comment.delete as jest.Mock).mockResolvedValue({ id: "c-1" });
      await api().deleteComment("c-1");
      expect(ctx.requireBotUser).toHaveBeenCalledWith("DELETE_ANY_COMMENTS");
      expect(db.comment.delete).toHaveBeenCalled();
    });
  });
});
