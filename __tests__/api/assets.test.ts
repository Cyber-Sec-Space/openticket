import { NextRequest, NextResponse } from "next/server";

jest.mock("next/server", () => {
  class MockNextResponse {
    constructor(body: any, init: any) {
      (this as any).body = body;
      (this as any).status = init?.status || 200;
    }
    static json(data: any, init: any) {
      return { status: init?.status || 200, json: async () => data };
    }
    static redirect(url: string) {
      return { status: 302, url };
    }
  }
  return {
    NextRequest: class MockNextRequest {
      url: string;
      method: string;
      body: any;
      constructor(url: string, options: any) {
        this.url = url;
        this.method = options?.method || "GET";
        this.body = options?.body;
      }
      async json() { return JSON.parse(this.body); }
    },
    NextResponse: MockNextResponse
  };
});

import { GET, POST } from "@/app/api/assets/route";
import { db } from "@/lib/db";
import { apiAuth } from "@/lib/api-auth";

jest.mock("@/lib/api-auth", () => ({ apiAuth: jest.fn() }));
jest.mock("@/lib/db", () => ({
  db: {
    asset: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn()
    },
    auditLog: {
      create: jest.fn()
    }
  }
}));

describe("Assets API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/assets", () => {
    it("returns 401 if unauthenticated", async () => {
      (apiAuth as jest.Mock).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/assets", {}) as any;
      const res = await GET(req);
      expect((res as any).status).toBe(401);
    });

    it("returns 403 if missing VIEW_ASSETS permission", async () => {
      (apiAuth as jest.Mock).mockResolvedValue({ user: { permissions: [] } });
      const req = new NextRequest("http://localhost/api/assets", {}) as any;
      const res = await GET(req);
      expect((res as any).status).toBe(403);
    });

    it("returns 200 and list of assets with proper pagination", async () => {
      (apiAuth as jest.Mock).mockResolvedValue({ user: { permissions: ["VIEW_ASSETS"] } });
      (db.asset.findMany as jest.Mock).mockResolvedValue([{ id: "1", name: "test-asset" }]);
      (db.asset.count as jest.Mock).mockResolvedValue(1);

      const req = new NextRequest("http://localhost/api/assets?page=1&limit=10", {}) as any;
      const res = await GET(req);
      
      expect((res as any).status).toBe(200);
      const json = await (res as any).json();
      expect(json).toHaveLength(1);
    });
  });

  describe("POST /api/assets", () => {
    it("returns 401 if unauthenticated", async () => {
      (apiAuth as jest.Mock).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/assets", { method: 'POST', body: JSON.stringify({}) }) as any;
      const res = await POST(req);
      expect((res as any).status).toBe(401);
    });

    it("returns 403 if missing CREATE_ASSETS permission", async () => {
      (apiAuth as jest.Mock).mockResolvedValue({ user: { permissions: ["VIEW_ASSETS"] } });
      const req = new NextRequest("http://localhost/api/assets", { method: 'POST', body: JSON.stringify({}) }) as any;
      const res = await POST(req);
      expect((res as any).status).toBe(403);
    });

    it("creates an asset successfully", async () => {
      (apiAuth as jest.Mock).mockResolvedValue({ user: { permissions: ["CREATE_ASSETS"] } });
      (db.asset.findFirst as jest.Mock).mockResolvedValue(null);
      (db.asset.create as jest.Mock).mockResolvedValue({ id: "1", name: "new-asset" });

      const req = new NextRequest("http://localhost/api/assets", {
        method: "POST",
        body: JSON.stringify({ name: "new-asset", type: "SERVER" })
      }) as any;

      const res = await POST(req);
      expect((res as any).status).toBe(201);
      const json = await (res as any).json();
      expect(json.name).toBe("new-asset");
    });

  });
});
