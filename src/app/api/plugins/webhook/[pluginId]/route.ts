import { NextRequest, NextResponse } from "next/server";
import { activePlugins } from "@/plugins";
import { db } from "@/lib/db";
import { parsePluginConfig } from "@/lib/plugins/crypto";
import { createPluginContext } from "@/lib/plugins/sdk-context";
import crypto from "crypto";

function verifyWebhookSignature(rawBody: string, secret: string, providedSignature: string | null) {
  if (!providedSignature) return false;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const left = Buffer.from(expected);
  const right = Buffer.from(providedSignature);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export async function POST(req: NextRequest, props: { params: Promise<{ pluginId: string }> }) {
  const params = await props.params;
  const pluginId = params.pluginId;
  
  // 1. Validate Plugin Registration
  const plugin = activePlugins.find((p) => p && p.manifest && p.manifest.id === pluginId);
  if (!plugin) {
    return NextResponse.json({ error: "Plugin not found or not physically registered in the local build." }, { status: 404 });
  }
  
  // 2. Validate Database DB State
  const state = await db.pluginState.findUnique({ where: { id: pluginId } });
  if (!state || !state.isActive) {
    return NextResponse.json({ error: "Plugin is disabled by the administrator." }, { status: 403 });
  }

  // 3. Ensure Hook Exists
  if (!plugin.hooks || !plugin.hooks.onWebhookReceived) {
    return NextResponse.json({ error: "Plugin does not implement onWebhookReceived hook." }, { status: 405 });
  }

  // 4. Decrypt configurations securely
  const config = state.configJson ? parsePluginConfig(state.configJson) : {};
  const context = await createPluginContext(plugin.manifest.id, plugin.manifest.name);
  const webhookSecret = typeof config.WEBHOOK_SECRET === "string" ? config.WEBHOOK_SECRET.trim() : "";
  let requestForPlugin: Request = req;

  if (webhookSecret) {
    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature") || req.headers.get("x-hub-signature-256");
    const authHeader = req.headers.get("authorization");
    const apiKeyHeader = req.headers.get("x-api-key");
    
    let isValid = false;

    // 1. Cryptographic HMAC Verification (Used by GitHub, Stripe, etc.)
    if (signature) {
      isValid = verifyWebhookSignature(rawBody, webhookSecret, signature);
    }
    
    // 2. Static Header Verification (Used by generic API clients, Datadog, Slack, etc.)
    if (!isValid && (apiKeyHeader === webhookSecret || authHeader === `Bearer ${webhookSecret}`)) {
      isValid = true;
    }
    
    // 3. Static Body Payload Verification (Used by simpler Webhook dispatchers)
    if (!isValid) {
      try {
        const jsonBody = JSON.parse(rawBody);
        if (jsonBody && (jsonBody.secret === webhookSecret || jsonBody.token === webhookSecret)) {
          isValid = true;
        }
      } catch (e) {
        // Not a JSON payload, ignore
      }
    }

    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }

    requestForPlugin = new Request(req.url, {
      method: req.method,
      headers: req.headers,
      body: rawBody,
    });
  }

  // 5. Time-Bomb Execution Sandbox (5 Seconds TTL)
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
       setTimeout(() => reject(new Error("Execution Timeout: Plugin exceeded the 5000ms sandbox time-bomb limit.")), 5000);
    });

    const response = await Promise.race([
      plugin.hooks.onWebhookReceived(requestForPlugin, config, context),
      timeoutPromise
    ]);

    // 6. Return standard Web Response
    if (response instanceof Response) {
      return response;
    }
    
    // Fallback if plugin accidentally returned JSON object instead of NextResponse
    return NextResponse.json(response || { success: true }, { status: 200 });
  } catch (error: any) {
    console.error(`[Webhook Gateway Router] Critical Sandbox Execution Fault in Plugin [${pluginId}]:`, error);
    return NextResponse.json({ 
      error: "Plugin webhook execution fault or timeout.", 
      details: error.message || "Unknown error inside plugin." 
    }, { status: 500 });
  }
}
