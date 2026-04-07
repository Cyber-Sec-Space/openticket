import { db } from "@/lib/db"

interface WebhookPayload {
  title: string
  description: string
  severity: string
  url: string
}

function isTargetSecure(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    
    // Basic SSRF Defenses (Cloud Metadata / Loopback Isolation)
    const hn = parsed.hostname;
    if (/^127\./.test(hn)) return false;
    if (hn === 'localhost') return false;
    if (hn === '0.0.0.0') return false; // Null IP Loopback bypass guard
    if (hn === '169.254.169.254') return false; // AWS/GCP/Azure Metadata
    if (/^192\.168\./.test(hn)) return false;
    if (/^10\./.test(hn)) return false;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hn)) return false;
    if (hn.includes("::1") || hn === '[::]' || hn === '::') return false;
    
    return true;
  } catch {
    return false;
  }
}

export async function dispatchWebhook(payload: WebhookPayload) {
  try {
    const settings = await db.systemSetting.findUnique({ where: { id: "global" } })
    if (!settings || !settings.webhookEnabled || !settings.webhookUrl) {
      return
    }

    if (!isTargetSecure(settings.webhookUrl)) {
      console.warn(`[WEBHOOK_ERROR] Inhibited webhook dispatch. Target violates SSRF security boundaries: ${settings.webhookUrl}`)
      return;
    }

    // Format for common Discord/Slack Webhook structure
    const body = {
      content: `🚨 **New ${payload.severity} Alert** 🚨`,
      embeds: [
        {
          title: payload.title,
          description: payload.description,
          url: payload.url,
          color: payload.severity === 'CRITICAL' ? 16711680 : 
                 payload.severity === 'HIGH' ? 16737024 : 
                 payload.severity === 'MEDIUM' ? 16753920 : 65280
        }
      ]
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s tarpit barrier

    try {
      await fetch(settings.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      })
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.error("[WEBHOOK_ERROR] Target timeout (5000ms threshold breached). Potential tarpit detected.");
    } else {
      console.error("[WEBHOOK_ERROR] Failed to dispatch webhook:", error);
    }
  }
}
