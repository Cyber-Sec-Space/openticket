import { db } from "@/lib/db"
import dns from "dns"
import { getGlobalSettings } from "@/lib/settings";
import { runAsync } from "@/lib/utils/async";

interface WebhookPayload {
  title: string
  description: string
  severity: string
  url: string
}

async function isTargetSecure(urlStr: string): Promise<{ isSecure: boolean, address?: string, parsed?: URL }> {
  try {
    const parsed = new URL(urlStr);
    if (!['http:', 'https:'].includes(parsed.protocol)) return { isSecure: false };
    
    const hn = parsed.hostname;
    // Initial string check
    if (/^127\./.test(hn) || hn === 'localhost' || hn === '0.0.0.0' || hn === '169.254.169.254' || /^192\.168\./.test(hn) || /^10\./.test(hn) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hn) || hn.includes("::1") || hn === '[::]' || hn === '::') {
      return { isSecure: false };
    }
    
    // DNS Resolution for actual remote IP bounds check
    const { address } = await dns.promises.lookup(hn);
    
    if (/^127\./.test(address) || address === '0.0.0.0' || address === '169.254.169.254' || /^192\.168\./.test(address) || /^10\./.test(address) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(address) || address.includes("::1")) {
      return { isSecure: false };
    }

    return { isSecure: true, address, parsed };
  } catch (error) {
    // If DNS resolution fails, implicitly block outbound connection
    return { isSecure: false };
  }
}

export async function dispatchWebhook(payload: WebhookPayload) {
  try {
    const settings = await getGlobalSettings()
    if (!settings || !settings.webhookEnabled || !settings.webhookUrl) {
      return
    }

    // SSRF FIX: Validate and freeze the IP address from a single DNS lookup
    const { isSecure, address, parsed } = await isTargetSecure(settings.webhookUrl);
    if (!isSecure || !address || !parsed) {
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

    return runAsync(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s tarpit barrier

      // SSRF FIX: Rewrite the URL to use the frozen resolved IP, but manually supply the Host header
      const safeUrl = `${parsed.protocol}//${address}${parsed.port ? `:${parsed.port}` : ''}${parsed.pathname}${parsed.search}`;

      try {
        await fetch(safeUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Host': parsed.hostname 
          },
          body: JSON.stringify(body),
          signal: controller.signal
        })
      } finally {
        clearTimeout(timeoutId);
      }
    });

  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.error("[WEBHOOK_ERROR] Target timeout (5000ms threshold breached). Potential tarpit detected.");
    } else {
      console.error("[WEBHOOK_ERROR] Failed to dispatch webhook:", error);
    }
  }
}
