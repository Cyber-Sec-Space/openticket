import { db } from "@/lib/db"

interface WebhookPayload {
  title: string
  description: string
  severity: string
  url: string
}

export async function dispatchWebhook(payload: WebhookPayload) {
  try {
    const settings = await db.systemSetting.findUnique({ where: { id: "global" } })
    if (!settings || !settings.webhookEnabled || !settings.webhookUrl) {
      return
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

    await fetch(settings.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch (error) {
    console.error("[WEBHOOK_ERROR] Failed to dispatch webhook:", error)
  }
}
