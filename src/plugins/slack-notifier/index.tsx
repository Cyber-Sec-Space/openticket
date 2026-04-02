import { OpenTicketPlugin } from "@/lib/plugins/types";

async function dispatchSecureSlack(text: string) {
  const url = process.env.SLACK_WEBHOOK_URL;
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

// React Component for Dashboard UI Extensibility
function SlackStatusWidget() {
  const isArmed = !!process.env.SLACK_WEBHOOK_URL;
  return (
    <div className="glass-card rounded-xl border border-white/10 p-5 shadow-sm hover:shadow-lg transition-all animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${isArmed ? 'bg-green-500 animate-pulse' : 'bg-red-500'} shadow-[0_0_10px_currentColor]`} />
        <div>
          <h3 className="font-bold text-sm tracking-wide text-primary">SLACK PLUGIN</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {isArmed ? "Armed & Intercepting Webhooks." : "Offline: Missing SLACK_WEBHOOK_URL API Key."}
          </p>
        </div>
      </div>
    </div>
  );
}

export const slackIntegration: OpenTicketPlugin = {
  manifest: {
    id: "slack-notifier-01",
    name: "Slack Critical Notifier",
    description: "Intercepts Critical/High Incidents and Auto-Quarantined Assets, broadcasting native payloads directly to a Slack SOC Channel via Webhooks.",
    version: "1.0.0"
  },

  hooks: {
    onIncidentCreated: async (incident) => {
      if (incident.severity === "CRITICAL" || incident.severity === "HIGH") {
        await dispatchSecureSlack(`🚨 *[${incident.severity} INCIDENT]* \n*Title:* ${incident.title}\n*Status:* Tracking Active.`);
      }
    },
    
    onAssetCompromise: async (asset) => {
      await dispatchSecureSlack(`🛡️ *[ASSET COMPROMISE]* \n*Asset:* ${asset.name} (${asset.ipAddress || "Unknown IP"})\n*Action:* Structurally Quarantined by SOAR Automations.`);
    }
  },

  ui: {
    dashboardWidgets: [SlackStatusWidget]
  }
};
