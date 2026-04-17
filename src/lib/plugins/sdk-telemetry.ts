import { db } from "@/lib/db"
import { PluginSystemError, PluginInputError, withPluginErrorHandling } from './errors'
import { SdkExecutionContext } from './sdk-types'

export function createTelemetryApi(ctx: SdkExecutionContext) {
  return {
    pushNotification: withPluginErrorHandling(async (targetUserId: string, title: string, body: string, link?: string) => {
      ctx.requireBotUser(); // Base communication capability
      if (!targetUserId || !title || !body) throw new PluginInputError("SDK Input Exception: target, title, and body are required.");

      // Input truncations for Notification length safety
      const safeTitle = title.substring(0, 100);
      const safeBody = body.substring(0, 500);

      return await db.userNotification.create({
        data: { userId: targetUserId, title: safeTitle, body: safeBody, link }
      });
    }),

    logPluginMetric: async (metricName: string, value: number, payload?: any) => {
      // Intentionally not wrapped in withPluginErrorHandling because failures should be silent
      ctx.requireBotUser(); // Base telemetry capability
      if (!metricName) throw new PluginInputError("SDK Input Exception: Metric name required");

      try {
        const now = new Date();
        // Align to 30-min window for MetricSnapshot
        const windowMs = 30 * 60 * 1000;
        const roundedTime = new Date(Math.floor(now.getTime() / windowMs) * windowMs);

        const safePayload = JSON.stringify({ 
           value, 
           ...(typeof payload === 'object' ? payload : {}) 
        });

        // Insert directly as user-scoped metrics tied solely to the plugin identifier
        return await db.metricSnapshot.create({
          data: {
            timestamp: roundedTime,
            scopeType: 'USER', 
            scopeId: `PLUGIN_${ctx.pluginId}_${metricName}`,
            payload: safePayload.length > 5000 ? safePayload.substring(0, 5000) : safePayload
          }
        });
      } catch (error) { 
         // Metric overlap or DB fail; catch quietly to prevent crashing the plugin execution flow
         return null;
      }
    },

    logAudit: withPluginErrorHandling(async (action: string, entityType: string, entityId: string, changes: any) => {
      const id = ctx.requireBotUser(); 
      if (!action || typeof action !== 'string') throw new PluginInputError("SDK Input Exception: Audit 'action' required.");
      if (!entityType || typeof entityType !== 'string') throw new PluginInputError("SDK Input Exception: Audit 'entityType' required.");
      if (!entityId || typeof entityId !== 'string') throw new PluginInputError("SDK Input Exception: Audit 'entityId' required.");

      const prefixedAction = action.startsWith(`[PLUGIN:${ctx.pluginId}]`) ? action : `[PLUGIN:${ctx.pluginId}] ${action.trim()}`;
      return await db.auditLog.create({
        data: { action: prefixedAction, entityType, entityId, userId: id, changes }
      });
    }),

    deleteComment: withPluginErrorHandling(async (commentId: string) => {
      // Enforce basic deletion minimum. A plugin only deletes what it owns unless it has ANY_COMMENTS.
      const id = ctx.requireBotUser('DELETE_OWN_COMMENTS');
      if (!commentId) throw new PluginInputError("SDK Input Exception: Comment ID required.");

      const comment = await db.comment.findUnique({ where: { id: commentId } });
      if (!comment) return null; // Idempotent

      // Zero-Trust Check: if the plugin didn't author it, verify DELETE_ANY_COMMENTS
      if (comment.authorId !== id) {
         ctx.requireBotUser('DELETE_ANY_COMMENTS');
      }

      const [deleted] = await db.$transaction([
        db.comment.delete({ where: { id: commentId } }),
        db.auditLog.create({
           data: { action: `[PLUGIN:${ctx.pluginId}] COMMENT_DELETED`, entityType: "Comment", entityId: commentId, userId: id, changes: { "status": "purged" } }
        })
      ]);
      return deleted;
    })
  }
}
