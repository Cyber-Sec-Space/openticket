jest.mock("@/lib/db", () => ({ 
  db: { 
    $queryRaw: jest.fn(), 
    incident: { count: jest.fn() },
    vulnerability: { count: jest.fn() },
    asset: { count: jest.fn() }
  } 
}));

import { MetricsService } from "@/lib/metrics-service";
import { db } from "@/lib/db";

describe("MetricsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns dashboard metrics with correct formatting", async () => {
    (db.incident.count as jest.Mock).mockImplementation(({ where }) => {
      if (where.status === "NEW") return Promise.resolve(10);
      if (where.status === "IN_PROGRESS") return Promise.resolve(5);
      return Promise.resolve(0);
    });

    (db.vulnerability.count as jest.Mock).mockResolvedValue(20);
    (db.asset.count as jest.Mock).mockResolvedValue(30);

    const metrics = await MetricsService.getDashboardMetrics();

    expect(metrics.activeIncidents).toBe(15); // 10 + 5
    expect(metrics.openVulnerabilities).toBe(20);
    expect(metrics.totalAssets).toBe(30);
  });
});
