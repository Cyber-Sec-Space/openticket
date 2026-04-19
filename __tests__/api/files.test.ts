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

import { GET } from "@/app/api/files/[filename]/route";
import { db } from "@/lib/db";
import { auth } from "@/auth";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/db", () => ({
  db: {
    attachment: {
      findFirst: jest.fn()
    }
  }
}));

describe("Files API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 if unauthenticated", async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/files/test.txt", {}) as any;
    const res = await GET(req, { params: Promise.resolve({ filename: "test.txt" }) } as any);
    expect((res as any).status).toBe(401);
  });

  it("returns 404 if file not found in DB", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user1", permissions: [] } });
    (db.attachment.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/files/test.txt", {}) as any;
    const res = await GET(req, { params: Promise.resolve({ filename: "test.txt" }) } as any);
    expect((res as any).status).toBe(404);
  });

  it("returns 403 if BOLA check fails", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user1", permissions: [] } });
    (db.attachment.findFirst as jest.Mock).mockResolvedValue({
      id: "test",
      filename: "test.txt",
      filePath: "/test.txt",
      mimeType: "text/plain",
      incident: {
        assignees: [{ id: "other_user" }]
      }
    });

    const req = new NextRequest("http://localhost/api/files/test.txt", {}) as any;
    const res = await GET(req, { params: Promise.resolve({ filename: "test.txt" }) } as any);
    expect((res as any).status).toBe(403);
  });
});
