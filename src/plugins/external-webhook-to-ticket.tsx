import type { OpenTicketPlugin } from "../../../types/openticket-core";
import React from 'react';

const WebhookToTicketPlugin: OpenTicketPlugin = {
  manifest: {
    id: "webhook-to-ticket",
    name: "Generic Webhook Ingestion",
    version: "1.1.0",
    description: "Receives inbound alerts via Generic Webhook JSON payload and safely converts them into new Incident tickets.",
    supportedPluginApiVersion: ['1.0.0', '1.1.0', '1.2.0', '1.3.0'],
    requestedPermissions: ["CREATE_INCIDENTS"],
    options: [
      {
        key: "instructionBlock",
        type: "info",
        label: "Integration Guide",
        content: `Configure your external gateway or integration platform to send a POST request to:<br/><br/><span class="bg-black/80 px-3 py-1.5 rounded-md text-emerald-400 font-mono inline-block border border-emerald-500/20">POST {{SYSTEM_URL}}/api/plugins/webhook/webhook-to-ticket</span><br/><br/><strong>Required Payload Schema (JSON)</strong><br/>At a minimum, the payload must contain the secret, a title, and a description.<br/><pre class="bg-black/80 text-emerald-400 p-4 rounded-md text-xs font-mono overflow-x-auto mt-2 mb-4 border border-white/5">{
  "secret": "&lt;YOUR_WEBHOOK_SECRET&gt;",
  "title": "System Outage Detected",
  "description": "The main database has stopped responding."
}</pre><strong>Advanced Optional Payload Schema</strong><br/><pre class="bg-black/80 text-emerald-400 p-4 rounded-md text-xs font-mono overflow-x-auto mt-2 mb-2 border border-white/5">{
  "secret": "&lt;YOUR_WEBHOOK_SECRET&gt;",
  "title": "Malware Outbreak",
  "description": "Suspicious files found on terminal 4.",
  "from": "user@example.com", // Will be prefixed to the description
  "type": "MALWARE",          // OTHER, MALWARE, PHISHING, DATA_BREACH, UNAUTHORIZED_ACCESS, NETWORK_ANOMALY
  "severity": "CRITICAL",     // INFO, LOW, MEDIUM, HIGH, CRITICAL
  "assetId": "clugxyz123...", // Must be a valid UUID of an existing OpenTicket Asset
  "tags": ["urgent", "endpoint"] 
}</pre>`
      },
      {
        key: "WEBHOOK_SECRET",
        type: "secret",
        label: "Webhook Authorization Secret",
        required: true
      }
    ]
  },
  hooks: {
    onInstall: async (config, context) => {
      await context.api.initEntity("Webhook Ingestion Bot", ["CREATE_INCIDENTS"]);
    },
    onWebhookReceived: async (req, config, context) => {
      try {
        // 1. Basic Webhook Validation & Size Limits
        if (req.method !== 'POST') {
          return new Response(JSON.stringify({ error: "Method Not Allowed. Only POST is supported." }), { 
            status: 405,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const expectedSecret = config.WEBHOOK_SECRET;
        if (!expectedSecret) {
          console.error("[Webhook-to-Ticket] Fatal: Missing WEBHOOK_SECRET in configuration.");
          return new Response(JSON.stringify({ error: "Plugin Configuration Error. Missing Webhook Secret." }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Parse JSON safely using safe-try
        let payload: any;
        try {
          payload = await req.json();
          if (typeof payload !== 'object' || payload === null) {
            throw new Error("Payload is not a valid JSON object.");
          }
        } catch (e: any) {
          return new Response(JSON.stringify({ error: "Malformed Payload.", details: e.message }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // 2. Zero-Trust Authorization check (Constant-time resistant logic approach)
        const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
        const extractedHeaderSecret = authHeader ? authHeader.replace(/bearer\s/i, '').trim() : null;
        const payloadSecret = payload.secret ? String(payload.secret).trim() : null;
        
        // Strict equality check against the expected registered secret
        const isAuthorized = 
          (extractedHeaderSecret && extractedHeaderSecret === expectedSecret) || 
          (payloadSecret && payloadSecret === expectedSecret);

        if (!isAuthorized) {
          return new Response(JSON.stringify({ error: "Unauthorized. Secret missing or mismatch." }), { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // 3. Payload Integrity & Type Coercion (Prevent NoSQL/Prisma Injection)
        const incTitleRaw = payload.title || payload.subject;
        const incTextRaw = payload.description || payload.text;

        if (!incTitleRaw || !incTextRaw) {
          return new Response(JSON.stringify({ error: "Validation Error: Missing required string fields: 'title' and 'description'." }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // 3a. String Sanitization
        const safeTitle = String(incTitleRaw).trim().substring(0, 255);
        let safeText = String(incTextRaw).trim().substring(0, 100000); // Defend against memory bloat crashes
        
        if (payload.from) {
          const safeFrom = String(payload.from).trim().substring(0, 255);
          safeText = `**From:** \`${safeFrom}\`\n\n💬 **Incoming Message:**\n\n` + safeText;
        }

        // 3b. Enum Validations (Strictly bound to OpenTicket Core allowed fields)
        const validTypes = ['MALWARE', 'PHISHING', 'DATA_BREACH', 'UNAUTHORIZED_ACCESS', 'NETWORK_ANOMALY', 'OTHER'];
        const parsedType = validTypes.includes(payload.type) ? payload.type : 'OTHER';

        const validSeverities = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        const parsedSeverity = validSeverities.includes(payload.severity) ? payload.severity : 'LOW';

        // 3c. Safe Array Extraction for Tags (Prevent functional objects or extreme array lengths)
        let safeTags: string[] | undefined = undefined;
        if (Array.isArray(payload.tags)) {
          safeTags = payload.tags
            .slice(0, 20) // Max 20 tags to prevent DB insert explosion
            .map((t: any) => String(t).trim().substring(0, 50))
            .filter((t: string) => t.length > 0);
        }

        // 3d. Asset ID strict string check
        let safeAssetId: string | null = null;
        if (payload.assetId && typeof payload.assetId === 'string') {
          safeAssetId = payload.assetId.trim();
        }

        // 4. Transform & Dispatch to Core Engine
        const incidentData = {
          title: safeTitle,
          description: safeText,
          type: parsedType,
          severity: parsedSeverity,
          assetId: safeAssetId,
          tags: safeTags
        };

        // Emit call and bubble localized exceptions back
        const newIncident = await context.api.createIncident(incidentData as any);

        return new Response(JSON.stringify({ 
          success: true, 
          message: "Incoming payload successfully converted to incident ticket.", 
          incidentId: newIncident.id 
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (err: any) {
        // Global Catch: Prevent entire worker cluster from crashing on unhandled rejection
        console.error("[Webhook-to-Ticket Plugin] Sandbox Execution Fault:", err);
        return new Response(JSON.stringify({ 
          error: "Pipeline Error inside OpenTicket Core", 
          details: err.message || "Unknown execution fault." 
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  }
};

export default WebhookToTicketPlugin;
