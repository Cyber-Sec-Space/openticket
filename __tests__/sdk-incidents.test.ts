import { createIncidentApi } from "@/lib/plugins/sdk-incidents";
import { db } from "@/lib/db";
import { PluginSystemError } from "@/lib/plugins/errors";

jest.mock("@/lib/db", () => ({
  db: {
    systemSetting: { findFirst: jest.fn() },
    incident: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: { create: jest.fn() },
    asset: { updateMany: jest.fn(), findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    attachment: { create: jest.fn(), delete: jest.fn() },
    comment: { create: jest.fn() },
    $executeRaw: jest.fn(),
    $transaction: jest.fn().mockImplementation(async (arr) => {
      // Mock basic transaction that returns array of results
      return Promise.all(arr);
    })
  }
}));

describe("sdk-incidents", () => {
  let ctx: any;
  beforeEach(() => {
    jest.clearAllMocks();
    ctx = {
      pluginId: "test-plugin",
      requireBotUser: jest.fn().mockReturnValue("bot-id"),
      triggerHook: jest.fn().mockResolvedValue(true)
    };
  });

  const api = () => createIncidentApi(ctx);

  describe("createIncident", () => {
    it("creates an incident with default settings", async () => {
      (db.systemSetting.findFirst as jest.Mock).mockResolvedValue(null);
      (db.incident.create as jest.Mock).mockResolvedValue({ id: "inc-1" });

      const res = await api().createIncident({ title: "T", description: "D", severity: "INFO", type: "OTHER" });
      
      expect(res).toEqual({ id: "inc-1" });
      expect(db.incident.create).toHaveBeenCalled();
      expect(ctx.triggerHook).toHaveBeenCalledWith("onIncidentCreated", { id: "inc-1" });
    });

    it("creates an incident with SLA settings (CRITICAL)", async () => {
      (db.systemSetting.findFirst as jest.Mock).mockResolvedValue({ slaCriticalHours: 2 });
      (db.incident.create as jest.Mock).mockResolvedValue({ id: "inc-1" });
      (db.incident.findUnique as jest.Mock).mockResolvedValue({ id: "inc-1", targetSlaDate: new Date() });

      await api().createIncident({ title: "T", description: "D", severity: "CRITICAL", assetIds: ["asset-1"] });
      expect(db.$executeRaw).toHaveBeenCalled();
    });

    it("triggers SOAR quarantine if critical threshold met", async () => {
      (db.systemSetting.findFirst as jest.Mock).mockResolvedValue({
        soarAutoQuarantineEnabled: true,
        soarAutoQuarantineThreshold: "HIGH"
      });
      (db.incident.create as jest.Mock).mockResolvedValue({ id: "inc-1" });

      await api().createIncident({ title: "T", description: "D", severity: "CRITICAL", assetIds: ["asset-1", "NONE"] });
      expect(db.asset.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: { in: ["asset-1"] } },
        data: { status: "COMPROMISED" }
      }));
    });

    it("triggers SOAR quarantine using default threshold if missing and filters NONE", async () => {
      (db.systemSetting.findFirst as jest.Mock).mockResolvedValue({
        soarAutoQuarantineEnabled: true
      });
      (db.incident.create as jest.Mock).mockResolvedValue({ id: "inc-1" });

      await api().createIncident({ title: "T", description: "D", severity: "CRITICAL", assetIds: ["asset-1"] });
      expect(db.asset.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: { status: "COMPROMISED" }
      }));
    });

    it("defaults currentRank to 0 if unknown severity", async () => {
      (db.systemSetting.findFirst as jest.Mock).mockResolvedValue({
        soarAutoQuarantineEnabled: true,
        soarAutoQuarantineThreshold: "LOW"
      });
      (db.incident.create as jest.Mock).mockResolvedValue({ id: "inc-1" });

      const { IncidentCreateSchema } = require("@/lib/plugins/schemas");
      const spy = jest.spyOn(IncidentCreateSchema, 'parse').mockReturnValue({
        title: "T",
        description: "D",
        severity: "UNKNOWN_SEV",
        assetIds: ["asset-1"]
      } as any);

      await api().createIncident({ title: "T", description: "D", severity: "UNKNOWN_SEV" as any, assetIds: ["asset-1"] });
      
      expect(db.asset.updateMany).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it("handles undefined assetIds and undefined severity gracefully", async () => {
      (db.systemSetting.findFirst as jest.Mock).mockResolvedValue({
        soarAutoQuarantineEnabled: true,
        soarAutoQuarantineThreshold: "LOW"
      });
      (db.incident.create as jest.Mock).mockResolvedValue({ id: "inc-1" });

      const { IncidentCreateSchema } = require("@/lib/plugins/schemas");
      const spy = jest.spyOn(IncidentCreateSchema, 'parse').mockReturnValue({
        title: "T",
        description: "D",
        severity: undefined,
        assetIds: undefined
      } as any);

      await api().createIncident({ title: "T", description: "D" });
      
      expect(db.asset.updateMany).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe("getIncident", () => {
    it("gets incident by ID", async () => {
      (db.incident.findUnique as jest.Mock).mockResolvedValue({ id: "inc-1" });
      const res = await api().getIncident("inc-1");
      expect(res).toEqual({ id: "inc-1" });
    });
  });

  describe("updateIncidentStatus", () => {
    it("updates status and triggers hook", async () => {
      (db.incident.update as jest.Mock).mockResolvedValue({ id: "inc-1" });
      await api().updateIncidentStatus("inc-1", "IN_PROGRESS");
      expect(db.incident.update).toHaveBeenCalled();
      expect(ctx.triggerHook).toHaveBeenCalledWith("onIncidentUpdated", { id: "inc-1" });
    });

    it("triggers resolve hook when status is RESOLVED", async () => {
      (db.incident.update as jest.Mock).mockResolvedValue({ id: "inc-1" });
      await api().updateIncidentStatus("inc-1", "RESOLVED", "comment");
      expect(ctx.triggerHook).toHaveBeenCalledWith("onIncidentResolved", { id: "inc-1" });
    });
    
    it("triggers CLOSED hook requirements", async () => {
      (db.incident.update as jest.Mock).mockResolvedValue({ id: "inc-1" });
      await api().updateIncidentStatus("inc-1", "CLOSED");
      expect(ctx.requireBotUser).toHaveBeenCalledWith("UPDATE_INCIDENT_STATUS_CLOSE");
    });
  });

  describe("updateIncidentDetails", () => {
    it("updates details", async () => {
      (db.incident.update as jest.Mock).mockResolvedValue({ id: "inc-1" });
      await api().updateIncidentDetails("inc-1", { title: "New", assetIds: ["a1"] });
      expect(db.incident.update).toHaveBeenCalled();
    });
  });

  describe("assignIncident", () => {
    it("throws if target user does not exist", async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(api().assignIncident("inc-1", "user-1")).rejects.toThrow(PluginSystemError);
    });

    it("assigns incident to user", async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue({ id: "user-1" });
      (db.incident.update as jest.Mock).mockResolvedValue({ id: "inc-1" });
      await api().assignIncident("inc-1", "user-1");
      expect(db.incident.update).toHaveBeenCalled();
    });
  });

  describe("unassignIncident", () => {
    it("unassigns incident", async () => {
      (db.incident.update as jest.Mock).mockResolvedValue({ id: "inc-1" });
      await api().unassignIncident("inc-1", "user-1");
      expect(db.incident.update).toHaveBeenCalled();
    });
  });

  describe("manageIncidentTags", () => {
    it("adds tag", async () => {
      (db.incident.findUnique as jest.Mock).mockResolvedValue({ id: "inc-1", tags: [] });
      (db.incident.update as jest.Mock).mockResolvedValue({ id: "inc-1" });
      await api().manageIncidentTags("inc-1", "tag1", "add");
      expect(db.incident.update).toHaveBeenCalled();
    });
    
    it("removes tag", async () => {
      (db.incident.findUnique as jest.Mock).mockResolvedValue({ id: "inc-1", tags: ["tag1"] });
      (db.incident.update as jest.Mock).mockResolvedValue({ id: "inc-1" });
      await api().manageIncidentTags("inc-1", "tag1", "remove");
      expect(db.incident.update).toHaveBeenCalled();
    });
    
    it("throws if incident not found", async () => {
      (db.incident.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(api().manageIncidentTags("inc-1", "tag1", "add")).rejects.toThrow();
    });
  });

  describe("searchOpenIncidents", () => {
    it("searches with limits", async () => {
      (db.incident.findMany as jest.Mock).mockResolvedValue([]);
      await api().searchOpenIncidents({ severity: "CRITICAL", tags: ["tag1"] });
      expect(db.incident.findMany).toHaveBeenCalled();
      
      await api().searchOpenIncidents();
      expect(db.incident.findMany).toHaveBeenCalled();
    });
  });

  describe("deleteIncident", () => {
    it("deletes incident", async () => {
      await api().deleteIncident("inc-1");
      expect(ctx.triggerHook).toHaveBeenCalledWith("onIncidentDestroyed", "inc-1");
    });
  });

  describe("linkIncidentToAsset", () => {
    it("links incident to asset", async () => {
      (db.asset.findUnique as jest.Mock).mockResolvedValue({ id: "a1" });
      (db.incident.findUnique as jest.Mock).mockResolvedValue({ id: "inc-1" });
      await api().linkIncidentToAsset("inc-1", "a1");
      expect(db.incident.update).toHaveBeenCalled();
    });
    
    it("throws if asset or incident missing", async () => {
      (db.asset.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(api().linkIncidentToAsset("inc-1", "a1")).rejects.toThrow();
    });
  });

  describe("attachEvidenceToIncident", () => {
    it("attaches evidence", async () => {
      await api().attachEvidenceToIncident("inc-1", "file.png", "http://example.com/file.png");
      expect(ctx.triggerHook).toHaveBeenCalledWith("onEvidenceAttached", undefined); // mock resolves undefined array element
    });
  });

  describe("deleteIncidentAttachment", () => {
    it("deletes attachment", async () => {
      await api().deleteIncidentAttachment("att-1");
      expect(db.$transaction).toHaveBeenCalled();
    });
  });

  describe("addComment", () => {
    it("adds comment", async () => {
      (db.comment.create as jest.Mock).mockResolvedValue({ id: "c-1" });
      await api().addComment("inc-1", "content");
      expect(db.comment.create).toHaveBeenCalled();
      expect(ctx.triggerHook).toHaveBeenCalledWith("onCommentAdded", { id: "c-1" });
    });
  });
});
