import { db } from "@/lib/db"
import { PluginSystemError, PluginInputError, withPluginErrorHandling } from './errors'
import { SdkExecutionContext } from './sdk-types'
import { NotificationCreateSchema } from './schemas'
import { z } from "zod"

const IdSchema = z.string().min(1, "ID is required");

export function createTelemetryApi(ctx: SdkExecutionContext) {
  return {
    pushNotification: withPluginErrorHandling(async (targetUserId: string, title: string, body: string, link?: string) => {
      ctx.requireBotUser(); // Base communication capability
      const parsedData = NotificationCreateSchema.parse({ targetUserId, title, body, link });

      return await db.userNotification.create({
        data: { userId: parsedData.targetUserId, title: parsedData.title, body: parsedData.body, link: parsedData.link }
      });
    }),

    logPluginMetric: async (metricName: string, value: number, payload?: Record<string, unknown>) => {
      // Intentionally not wrapped in withPluginErrorHandling because failures should be silent
      ctx.requireBotUser(); // Base telemetry capability
      const validMetric = z.string().min(1).parse(metricName);

      try {
        const now = new Date();
        // Align to 30-min window for MetricSnapshot
        const windowMs = 30 * 60 * 1000;
        const roundedTime = new Date(Math.floor(now.getTime() / windowMs) * windowMs);

        const safePayload = JSON.stringify({ 
           value, 
           ...(payload || {}) 
        });

        // Insert directly as user-scoped metrics tied solely to the plugin identifier
        return await db.metricSnapshot.create({
          data: {
            timestamp: roundedTime,
            scopeType: 'USER', 
            scopeId: `PLUGIN_${ctx.pluginId}_${validMetric}`,
            payload: safePayload.length > 5000 ? safePayload.substring(0, 5000) : safePayload
          }
        });
      } catch (error) { 
         // Metric overlap or DB fail; catch quietly to prevent crashing the plugin execution flow
         return null;
      }
    },

    logAudit: withPluginErrorHandling(async (action: string, entityType: string, entityId: string, changes: Record<string, unknown>) => {
      const id = ctx.requireBotUser(); 
      const validAction = z.string().min(1).parse(action);
      const validEntityType = z.string().min(1).parse(entityType);
      const validEntityId = z.string().min(1).parse(entityId);
      const validChanges = z.record(z.string(), z.unknown()).parse(changes || {});

      const prefixedAction = validAction.startsWith(`[PLUGIN:${ctx.pluginId}]`) ? validAction : `[PLUGIN:${ctx.pluginId}] ${validAction.trim()}`;
      return await db.auditLog.create({
        data: { action: prefixedAction, entityType: validEntityType, entityId: validEntityId, userId: id, changes: validChanges }
      });
    }),

    deleteComment: withPluginErrorHandling(async (commentId: string) => {
      // Enforce basic deletion minimum. A plugin only deletes what it owns unless it has ANY_COMMENTS.
      const id = ctx.requireBotUser('DELETE_OWN_COMMENTS');
      const validCommentId = IdSchema.parse(commentId);

      const comment = await db.comment.findUnique({ where: { id: validCommentId } });
      if (!comment) return null; // Idempotent

      // Zero-Trust Check: if the plugin didn't author it, verify DELETE_ANY_COMMENTS
      if (comment.authorId !== id) {
         ctx.requireBotUser('DELETE_ANY_COMMENTS');
      }

      const [deleted] = await db.$transaction([
        db.comment.delete({ where: { id: validCommentId } }),
        db.auditLog.create({
           data: { action: `[PLUGIN:${ctx.pluginId}] COMMENT_DELETED`, entityType: "Comment", entityId: validCommentId, userId: id, changes: { status: "purged" } }
        })
      ]);
      return deleted;
    })
  }
}

