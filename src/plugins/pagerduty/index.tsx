import { OpenTicketPlugin } from "@/lib/plugins/types";

async function triggerPagerDutyAlert(title: string, details: string, config: Record<string, any>) {
  const routingKey = config.routingKey;
  if (!routingKey) return;
  
  try {
    await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routing_key: routingKey,
        event_action: 'trigger',
        payload: {
          summary: title,
          source: 'OpenTicket Platform',
          severity: 'critical',
          custom_details: { details }
        }
      })
    });
  } catch (error) {
    console.error("[PagerDuty Plugin] Failed to trigger incident.", error);
  }
}

export const pagerDutyIntegration: OpenTicketPlugin = {
  manifest: {
    id: "pagerduty-escalator-01",
    name: "PagerDuty Escalator",
    description: "Automatically triggers a PagerDuty incident when a CRITICAL severity issue is logged in OpenTicket, bridging the gap between SOC reporting and on-call response.",
    version: "1.1.0"
  },
  hooks: {
    onIncidentCreated: async (incident, config) => {
      if (incident.severity === "CRITICAL") {
        await triggerPagerDutyAlert(`Critical Security Incident: ${incident.title}`, `Status: Active\nDescription: ${incident.description}`, config);
      }
    }
  }
};
