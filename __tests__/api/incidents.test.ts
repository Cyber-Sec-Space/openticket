jest.mock("@/lib/api-auth", () => ({ apiAuth: jest.fn() }));
jest.mock("@/lib/db", () => ({ db: { incident: { findMany: jest.fn(), create: jest.fn() }, auditLog: { create: jest.fn() }, asset: { updateMany: jest.fn() } } }));
jest.mock("@/lib/auth-utils", () => ({ hasPermission: jest.fn() }));
jest.mock("@/lib/settings", () => ({ getGlobalSettings: jest.fn() }));

import { GET, POST } from "@/app/api/incidents/route";
import { apiAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/auth-utils";
import { getGlobalSettings } from "@/lib/settings";

describe("API /api/incidents", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("returns 401 if unauthorized", async () => {
      (apiAuth as jest.Mock).mockResolvedValue(null);
      const req = new Request("http://localhost/api/incidents");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("returns empty array if user has no view permissions", async () => {
      (apiAuth as jest.Mock).mockResolvedValue({ user: { id: "1" } });
      (hasPermission as jest.Mock).mockReturnValue(false);
      const req = new Request("http://localhost/api/incidents");
      const res = await GET(req);
      expect(await res.json()).toEqual([]);
    });

    it("fetches incidents with pagination", async () => {
      (apiAuth as jest.Mock).mockResolvedValue({ user: { id: "1" } });
      (hasPermission as jest.Mock).mockImplementation((s, p) => p === "VIEW_INCIDENTS_ALL");
      (db.incident.findMany as jest.Mock).mockResolvedValue([{ id: "inc-1" }]);
      
      const req = new Request("http://localhost/api/incidents?take=10&skip=5");
      const res = await GET(req);
      
      expect(await res.json()).toEqual([{ id: "inc-1" }]);
      expect(db.incident.findMany).toHaveBeenCalledWith(expect.objectContaining({
        take: 10,
        skip: 5
      }));
    });
  });

  describe("POST", () => {
    it("returns 401 if unauthorized", async () => {
      (apiAuth as jest.Mock).mockResolvedValue(null);
      const req = new Request("http://localhost/api/incidents", { method: "POST" });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("returns 403 if missing CREATE_INCIDENTS", async () => {
      (apiAuth as jest.Mock).mockResolvedValue({ user: { id: "1" } });
      (hasPermission as jest.Mock).mockReturnValue(false);
      const req = new Request("http://localhost/api/incidents", { method: "POST" });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it("returns 400 if title or description missing", async () => {
      (apiAuth as jest.Mock).mockResolvedValue({ user: { id: "1" } });
      (hasPermission as jest.Mock).mockReturnValue(true);
      const req = new Request("http://localhost/api/incidents", {
        method: "POST",
        body: JSON.stringify({})
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("creates an incident and triggers SOAR quarantine if critical", async () => {
      (apiAuth as jest.Mock).mockResolvedValue({ user: { id: "1" } });
      (hasPermission as jest.Mock).mockReturnValue(true);
      (getGlobalSettings as jest.Mock).mockResolvedValue({ soarAutoQuarantineEnabled: true, soarAutoQuarantineThreshold: "HIGH" });
      (db.incident.create as jest.Mock).mockResolvedValue({ id: "inc-new", severity: "CRITICAL" });

      const req = new Request("http://localhost/api/incidents", {
        method: "POST",
        body: JSON.stringify({ title: "Test", description: "Desc", severity: "CRITICAL", assetIds: ["ast-1"] })
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      expect(db.incident.create).toHaveBeenCalled();
      expect(db.asset.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: { in: ["ast-1"] } },
        data: { status: "COMPROMISED" }
      }));
    });
  });
});
