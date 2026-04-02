import { pagerDutyIntegration } from "@/plugins/pagerduty";
import { jiraIntegration } from "@/plugins/jira";
import { teamsIntegration } from "@/plugins/teams";
import { activePlugins } from "@/plugins";
import { Incident, Asset } from "@prisma/client";

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
) as jest.Mock;

describe("Store Plugins Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  it("PagerDuty plugin should trigger alert for CRITICAL severity", async () => {
    const mockIncident = { id: "inc-1", title: "Test", description: "Desc", severity: "CRITICAL" } as Incident;
    const config = { routingKey: "test-key" };
    
    await pagerDutyIntegration.hooks?.onIncidentCreated?.(mockIncident, config);
    
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('https://events.pagerduty.com/v2/enqueue', expect.objectContaining({
      method: "POST"
    }));
  });

  it("PagerDuty plugin should NOT trigger fetch if routingKey is missing", async () => {
    const mockIncident = { id: "inc-1", title: "Test", description: "Desc", severity: "CRITICAL" } as Incident;
    const config = {}; // missing routingKey
    
    await pagerDutyIntegration.hooks?.onIncidentCreated?.(mockIncident, config);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("PagerDuty plugin should catch and log fetch errors", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network Failure"));
    const mockIncident = { id: "inc-1", title: "Test", description: "Desc", severity: "CRITICAL" } as Incident;
    const config = { routingKey: "test-key" };
    
    await pagerDutyIntegration.hooks?.onIncidentCreated?.(mockIncident, config);
    expect(console.error).toHaveBeenCalledWith("[PagerDuty Plugin] Failed to trigger incident.", expect.any(Error));
  });

  it("Jira Plugin should log when an incident is resolved", async () => {
    const mockIncident = { id: "inc-1", title: "Test" } as Incident;
    await jiraIntegration.hooks?.onIncidentResolved?.(mockIncident, {});
    expect(console.log).toHaveBeenCalledWith("[Jira Plugin] Closing linked ticket for incident inc-1");
  });

  it("Teams Plugin should log when an asset is compromised", async () => {
    const mockAsset = { id: "asset-1", name: "Server A" } as Asset;
    await teamsIntegration.hooks?.onAssetCompromise?.(mockAsset, {});
    expect(console.log).toHaveBeenCalledWith("[MS Teams Plugin] Sending adaptive card for compromised asset: Server A");
  });

  it("activePlugins static array should contain the necessary plugins", () => {
    expect(activePlugins).toContain(pagerDutyIntegration);
    expect(activePlugins).toContain(jiraIntegration);
    expect(activePlugins).toContain(teamsIntegration);
  });
});
