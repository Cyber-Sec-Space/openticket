import { NextRequest, NextResponse } from "next/server";
import { activePlugins } from "@/plugins";
import { db } from "@/lib/db";
import { parsePluginConfig } from "@/lib/plugins/crypto";
import { createPluginContext } from "@/lib/plugins/sdk-context";
import crypto from "crypto";

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

  // 5. HMAC Webhook Signature Verification (optional, enabled when webhookSecret is configured)
  const webhookSecret = config?.webhookSecret as string | undefined;
  if (webhookSecret) {
    const signature = req.headers.get("x-webhook-signature") || req.headers.get("x-hub-signature-256");
    const body = await req.text();
    
    if (!signature) {
      return NextResponse.json({ error: "Missing webhook signature header (X-Webhook-Signature)." }, { status: 401 });
    }

    const expectedSig = "sha256=" + crypto.createHmac("sha256", webhookSecret).update(body).digest("hex");
    
    // Timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);
    
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return NextResponse.json({ error: "Invalid webhook signature. Request rejected." }, { status: 401 });
    }

    // Re-create a new Request with the consumed body so the plugin can still read it
    const newReq = new NextRequest(req.url, {
      method: req.method,
      headers: req.headers,
      body: body,
    });
    // Replace original req reference for downstream
    req = newReq;
  }

  // 6. Time-Bomb Execution Sandbox (5 Seconds TTL)
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
       setTimeout(() => reject(new Error("Execution Timeout: Plugin exceeded the 5000ms sandbox time-bomb limit.")), 5000);
    });

    const response = await Promise.race([
      plugin.hooks.onWebhookReceived(req, config, context),
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
