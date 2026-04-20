jest.mock("@/lib/db", () => ({ 
  db: { 
    $queryRaw: jest.fn(), 
    incident: { count: jest.fn(), findMany: jest.fn() },
    vulnerability: { count: jest.fn(), findMany: jest.fn() },
    asset: { count: jest.fn() },
    metricSnapshot: { findMany: jest.fn(), createMany: jest.fn() }
  } 
}));

import { getDashboardTrendData, getIntervalBucket } from "@/lib/metrics-service";
import { db } from "@/lib/db";

describe("Metrics Service (getDashboardTrendData)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calculates live metrics when no snapshots exist", async () => {
    const now = new Date();
    
    // Mock snapshot return empty
    (db.metricSnapshot.findMany as jest.Mock).mockResolvedValue([]);
    
    // Mock active incidents & vulns
    (db.incident.findMany as jest.Mock).mockResolvedValue([
      { createdAt: new Date(now.getTime() - 86400000), updatedAt: now, status: "NEW", severity: "HIGH", targetSlaDate: new Date(now.getTime() - 1000) }
    ]);
    (db.vulnerability.findMany as jest.Mock).mockResolvedValue([
      { createdAt: new Date(now.getTime() - 86400000), updatedAt: now, status: "NEW", severity: "CRITICAL" }
    ]);

    const data = await getDashboardTrendData('24h');
    
    expect(db.metricSnapshot.findMany).toHaveBeenCalled();
    expect(db.incident.findMany).toHaveBeenCalled();
    expect(db.vulnerability.findMany).toHaveBeenCalled();
    
    // Because downsampling aggregates over 24h into chunk of 1 (for 24h chunk = 30 min, intervalPoints = 1)
    // It returns multiple points. Let's just check the last point.
    const latest = data[data.length - 1];
    expect(latest.activeIncidents).toBe(1);
    expect(latest.activeVulns).toBe(1);
    expect(latest.slaBreached).toBe(1);
  });
});
