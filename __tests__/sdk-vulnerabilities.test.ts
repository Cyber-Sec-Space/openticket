import { createVulnerabilityApi } from "@/lib/plugins/sdk-vulnerabilities";
import { db } from "@/lib/db";
import { PluginSystemError } from "@/lib/plugins/errors";
import { getGlobalSettings } from "@/lib/settings";

jest.mock("@/lib/settings", () => ({
  getGlobalSettings: jest.fn()
}));

jest.mock("@/lib/db", () => ({
  db: {
    asset: { findUnique: jest.fn() },
    vulnerability: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    vulnerabilityAsset: {
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn()
    },
    user: { findUnique: jest.fn() },
    comment: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    attachment: { create: jest.fn(), delete: jest.fn() },
    $executeRaw: jest.fn(),
    $transaction: jest.fn().mockImplementation(async (arr) => Promise.all(arr))
  }
}));

describe("sdk-vulnerabilities", () => {
  let ctx: any;
  beforeEach(() => {
    jest.clearAllMocks();
    ctx = {
      pluginId: "test-plugin",
      requireBotUser: jest.fn().mockReturnValue("bot-id"),
      triggerHook: jest.fn().mockResolvedValue(true)
    };
  });

  const api = () => createVulnerabilityApi(ctx);

  describe("reportVulnerability", () => {
    it("throws if asset not found", async () => {
      (db.asset.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(api().reportVulnerability("T", "D", "CRITICAL", "a-1")).rejects.toThrow(PluginSystemError);
    });

    it("creates vulnerability with CRITICAL severity and options", async () => {
      (db.asset.findUnique as jest.Mock).mockResolvedValue({ id: "a-1" });
      (getGlobalSettings as jest.Mock).mockResolvedValue({ vulnSlaCriticalHours: 2 });
      (db.vulnerability.create as jest.Mock).mockResolvedValue({ id: "v-1" });
      (db.vulnerability.findUnique as jest.Mock).mockResolvedValue({ id: "v-1", targetSlaDate: new Date() });

      const res = await api().reportVulnerability("T", "D", "CRITICAL", "a-1", { cveId: "CVE-2023-1234", cvssScore: 9.8 });
      expect(db.vulnerability.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ cveId: "CVE-2023-1234", cvssScore: 9.8 })
      }));
      expect(db.$executeRaw).toHaveBeenCalled();
      expect(res).toEqual({ id: "v-1", targetSlaDate: expect.any(Date) });
    });

    it("creates vulnerability with HIGH severity and no options", async () => {
      (db.asset.findUnique as jest.Mock).mockResolvedValue({ id: "a-1" });
      (getGlobalSettings as jest.Mock).mockResolvedValue(null); // Missing settings fallback to default
      (db.vulnerability.create as jest.Mock).mockResolvedValue({ id: "v-1" });
      (db.vulnerability.findUnique as jest.Mock).mockResolvedValue({ id: "v-1", targetSlaDate: new Date() });

      const res = await api().reportVulnerability("T", "D", "HIGH", "a-1");
      expect(db.vulnerability.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ cveId: null, cvssScore: null })
      }));
      expect(db.$executeRaw).toHaveBeenCalled();
    });

    it("creates vulnerability with MEDIUM severity", async () => {
      (db.asset.findUnique as jest.Mock).mockResolvedValue({ id: "a-1" });
      (getGlobalSettings as jest.Mock).mockResolvedValue({});
      (db.vulnerability.create as jest.Mock).mockResolvedValue({ id: "v-1" });
      (db.vulnerability.findUnique as jest.Mock).mockResolvedValue(null); // Simulated failure to refetch updated vuln

      await api().reportVulnerability("T", "D", "MEDIUM", "a-1");
      expect(db.$executeRaw).toHaveBeenCalled();
    });

    it("creates vulnerability with LOW severity", async () => {
      (db.asset.findUnique as jest.Mock).mockResolvedValue({ id: "a-1" });
      (getGlobalSettings as jest.Mock).mockResolvedValue({});
      (db.vulnerability.create as jest.Mock).mockResolvedValue({ id: "v-1" });

      await api().reportVulnerability("T", "D", "LOW", "a-1");
      expect(db.$executeRaw).toHaveBeenCalled();
    });

    it("creates vulnerability with default fallback severity (INFO)", async () => {
      (db.asset.findUnique as jest.Mock).mockResolvedValue({ id: "a-1" });
      (getGlobalSettings as jest.Mock).mockResolvedValue({});
      (db.vulnerability.create as jest.Mock).mockResolvedValue({ id: "v-1" });

      // @ts-ignore testing default switch case fallback
      await api().reportVulnerability("T", "D", "INFO", "a-1");
      expect(db.$executeRaw).not.toHaveBeenCalled(); // INFO does not trigger SLA raw update
    });
  });

  describe("getVulnerability", () => {
    it("gets vulnerability by ID", async () => {
      (db.vulnerability.findUnique as jest.Mock).mockResolvedValue({ id: "v-1" });
      const res = await api().getVulnerability("v-1");
      expect(res).toEqual({ id: "v-1" });
    });
  });

  describe("searchVulnerabilities", () => {
    it("searches vulnerabilities", async () => {
      (db.vulnerability.findMany as jest.Mock).mockResolvedValue([{ id: "v-1" }]);
      const res = await api().searchVulnerabilities({ severity: "CRITICAL", status: "OPEN" });
      expect(res).toEqual([{ id: "v-1" }]);
      expect(db.vulnerability.findMany).toHaveBeenCalled();
      
      await api().searchVulnerabilities();
      expect(db.vulnerability.findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe("updateVulnerabilityDetails", () => {
    it("updates details", async () => {
      (db.vulnerability.update as jest.Mock).mockResolvedValue({ id: "v-1" });
      await api().updateVulnerabilityDetails("v-1", { title: "New", cvssScore: 9.8 });
      expect(db.vulnerability.update).toHaveBeenCalled();
      expect(ctx.triggerHook).toHaveBeenCalledWith("onVulnerabilityUpdated", { id: "v-1" });
    });
  });

  describe("updateVulnerabilityStatus", () => {
    it("updates status", async () => {
      (db.vulnerability.update as jest.Mock).mockResolvedValue({ id: "v-1" });
      await api().updateVulnerabilityStatus("v-1", "RESOLVED");
      expect(db.vulnerability.update).toHaveBeenCalled();
    });
  });

  describe("addCommentToVulnerability", () => {
    it("adds comment", async () => {
      (db.comment.create as jest.Mock).mockResolvedValue({ id: "c-1" });
      await api().addCommentToVulnerability("v-1", "comment content");
      expect(db.comment.create).toHaveBeenCalled();
      expect(ctx.triggerHook).toHaveBeenCalledWith("onCommentAdded", { id: "c-1" });
    });
  });

  describe("assignVulnerability", () => {
    it("throws if target user missing", async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(api().assignVulnerability("v-1", "u-1")).rejects.toThrow(PluginSystemError);
    });

    it("assigns user", async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue({ id: "u-1" });
      (db.vulnerability.update as jest.Mock).mockResolvedValue({ id: "v-1" });
      await api().assignVulnerability("v-1", "u-1");
      expect(db.vulnerability.update).toHaveBeenCalled();
    });
  });

  describe("unassignVulnerability", () => {
    it("unassigns user", async () => {
      (db.vulnerability.update as jest.Mock).mockResolvedValue({ id: "v-1" });
      await api().unassignVulnerability("v-1", "u-1");
      expect(db.vulnerability.update).toHaveBeenCalled();
    });
  });

  describe("linkVulnerabilityToAsset", () => {
    it("throws if asset missing", async () => {
      (db.asset.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(api().linkVulnerabilityToAsset("v-1", "a-1")).rejects.toThrow(PluginSystemError);
    });

    it("links asset", async () => {
      (db.asset.findUnique as jest.Mock).mockResolvedValue({ id: "a-1" });
      (db.vulnerability.findUnique as jest.Mock).mockResolvedValue({ id: "v-1" });
      await api().linkVulnerabilityToAsset("v-1", "a-1");
      expect(db.$transaction).toHaveBeenCalled();
    });
  });

  describe("unlinkVulnerabilityFromAsset", () => {
    it("unlinks asset", async () => {
      (db.vulnerability.findUnique as jest.Mock).mockResolvedValue({ id: "v-1" });
      await api().unlinkVulnerabilityFromAsset("v-1", "a-1");
      expect(db.$transaction).toHaveBeenCalled();
    });
  });

  describe("updateVulnerabilityAssetStatus", () => {
    it("updates link status", async () => {
      (db.vulnerability.findUnique as jest.Mock).mockResolvedValue({ id: "v-1" });
      await api().updateVulnerabilityAssetStatus("v-1", "a-1", "MITIGATED");
      expect(db.$transaction).toHaveBeenCalled();
    });
  });

  describe("deleteVulnerability", () => {
    it("deletes vulnerability", async () => {
      await api().deleteVulnerability("v-1");
      expect(db.$transaction).toHaveBeenCalled();
      expect(ctx.triggerHook).toHaveBeenCalledWith("onVulnerabilityDestroyed", "v-1");
    });
  });

  describe("attachEvidenceToVulnerability", () => {
    it("attaches evidence", async () => {
      await api().attachEvidenceToVulnerability("v-1", "f.png", "http://example.com/f.png");
      expect(db.$transaction).toHaveBeenCalled();
      expect(ctx.triggerHook).toHaveBeenCalledWith("onEvidenceAttached", undefined);
    });
  });

  describe("deleteVulnerabilityAttachment", () => {
    it("deletes attachment", async () => {
      await api().deleteVulnerabilityAttachment("att-1");
      expect(db.$transaction).toHaveBeenCalled();
    });
  });
});
