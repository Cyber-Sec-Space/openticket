import { OpenTicketPlugin } from "@/lib/plugins/types";
import { db } from "@/lib/db";

async function dispatchSecureSlack(text: string, config: Record<string, any>) {
  const url = config.webhookUrl;
  if (!url) return;
  
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
  } catch (error) {
    console.error("[Slack Plugin] Webhook payload delivery failed.", error);
  }
}

export const slackIntegration: OpenTicketPlugin = {
  manifest: {
    id: "slack-notifier-01",
    name: "Slack Critical Notifier",
    description: "Intercepts Critical/High Incidents and Auto-Quarantined Assets, broadcasting native payloads directly to a Slack SOC Channel via Webhooks.",
    version: "1.0.0"
  },

  hooks: {
    onIncidentCreated: async (incident, config) => {
      if (incident.severity === "CRITICAL" || incident.severity === "HIGH") {
        await dispatchSecureSlack(`🚨 *[${incident.severity} INCIDENT]* \n*Title:* ${incident.title}\n*Status:* Tracking Active.`, config);
      }
    },
    
    onAssetCompromise: async (asset, config) => {
      await dispatchSecureSlack(`🛡️ *[ASSET COMPROMISE]* \n*Asset:* ${asset.name} (${asset.ipAddress || "Unknown IP"})\n*Action:* Structurally Quarantined by SOAR Automations.`, config);
    }
  }
};
