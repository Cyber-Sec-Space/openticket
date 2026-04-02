import { GET } from "../src/app/api/notifications/sync/route"
import { db } from "../src/lib/db"
import { auth } from "../src/auth"

jest.mock("../src/lib/db", () => ({
  db: {
    userNotification: {
      findMany: jest.fn(),
      updateMany: jest.fn()
    }
  }
}));

jest.mock("../src/auth", () => ({
  auth: jest.fn()
}));

jest.mock("next/server", () => {
  class MockNextResponse {
    status: number;
    constructor(body: any, init?: { status: number }) {
      this.status = init?.status || 200;
      return this;
    }
    static json(body: any) {
      return { status: 200, json: async () => body };
    }
  }
  return { NextResponse: MockNextResponse };
});

describe("GET /api/notifications/sync", () => {
  afterEach(() => jest.clearAllMocks());

  it("returns 401 if unauthorized", async () => {
    (auth as jest.Mock).mockResolvedValueOnce(null);
    const res = await GET() as any;
    expect(res.status).toBe(401);
  });

  it("returns empty array if no unpushed alerts", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({ user: { id: "user" } });
    (db.userNotification.findMany as jest.Mock).mockResolvedValueOnce([]);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual([]);
    expect(db.userNotification.updateMany).not.toHaveBeenCalled();
  });

  it("returns alerts and marks them as pushed", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({ user: { id: "user" } });
    const alerts = [ { id: "1" }, { id: "2" } ];
    (db.userNotification.findMany as jest.Mock).mockResolvedValueOnce(alerts);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(alerts);
    expect(db.userNotification.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["1", "2"] } },
      data: { isPushed: true }
    });
  });
});
