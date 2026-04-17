import { db } from "@/lib/db"
import { AssetType, AssetStatus } from "@prisma/client"
import { PluginSystemError, PluginInputError, withPluginErrorHandling } from './errors'
import { SdkExecutionContext } from './sdk-types'

export function createAssetApi(ctx: SdkExecutionContext) {
  return {
    createAsset: withPluginErrorHandling(async (name: string, type: AssetType, ipAddress?: string, externalId?: string, metadata?: any) => {
      const id = ctx.requireBotUser('CREATE_ASSETS');
      if (!name || typeof name !== 'string') throw new PluginInputError("SDK Input Exception: Asset name required");

      const asset = await db.asset.create({
        data: { 
          name, type, ipAddress, externalId, metadata: metadata || {},
          auditLogs: {
            create: { action: `[PLUGIN:${ctx.pluginId}] ASSET_CREATED`, userId: id, changes: { name, type, ipAddress, externalId } }
          }
        }
      });
      
      await ctx.triggerHook('onAssetCreated', asset);
      return asset;
    }),

    getAsset: withPluginErrorHandling(async (assetId: string) => {
      ctx.requireBotUser('VIEW_ASSETS');
      if (!assetId) throw new PluginInputError("SDK Input Exception: Asset ID required.");
      
      return await db.asset.findUnique({ where: { id: assetId } });
    }),

    getAssetByIp: withPluginErrorHandling(async (ipAddress: string) => {
      ctx.requireBotUser('VIEW_ASSETS');
      if (!ipAddress || typeof ipAddress !== 'string') throw new PluginInputError("SDK Input Exception: IP address required.");

      return await db.asset.findFirst({
        where: { ipAddress }
      });
    }),

    getAssetByIdentifier: withPluginErrorHandling(async (identifier: string) => {
      ctx.requireBotUser('VIEW_ASSETS');
      if (!identifier || typeof identifier !== 'string') throw new PluginInputError("SDK Input Exception: Identifier required.");

      return await db.asset.findFirst({
        where: { externalId: identifier }
      });
    }),

    searchAssets: withPluginErrorHandling(async (query?: { type?: AssetType, status?: AssetStatus, limit?: number }) => {
      ctx.requireBotUser('VIEW_ASSETS');
      const limit = Math.min(query?.limit || 50, 100);
      const conditions: any = {};
      if (query?.type) conditions.type = query.type;
      if (query?.status) conditions.status = query.status;

      return await db.asset.findMany({ where: conditions, take: limit });
    }),

    updateAssetDetails: withPluginErrorHandling(async (assetId: string, updates: { name?: string, type?: AssetType, ipAddress?: string | null, externalId?: string | null }) => {
      const id = ctx.requireBotUser('UPDATE_ASSETS');
      if (!assetId) throw new PluginInputError("SDK Input Exception: Asset ID required.");

      const updated = await db.asset.update({
        where: { id: assetId },
        data: {
          ...updates,
          auditLogs: {
            create: { action: `[PLUGIN:${ctx.pluginId}] ASSET_UPDATED`, userId: id, changes: updates }
          }
        }
      });
      
      await ctx.triggerHook('onAssetUpdated', updated);
      return updated;
    }),

    updateAssetStatus: withPluginErrorHandling(async (assetId: string, status: AssetStatus) => {
      const id = ctx.requireBotUser('UPDATE_ASSETS');
      if (!assetId || !status) throw new PluginInputError("SDK Input Exception: AssetId and Status are required.");

      const updated = await db.asset.update({
        where: { id: assetId },
        data: { 
          status,
          auditLogs: {
             create: { action: `[PLUGIN:${ctx.pluginId}] ASSET_STATUS_UPDATED`, userId: id, changes: { status } }
          }
        }
      });

      await ctx.triggerHook('onAssetUpdated', updated);
      return updated;
    }),

    updateAssetMetadata: withPluginErrorHandling(async (assetId: string, metadataPatch: any) => {
      const userId = ctx.requireBotUser('UPDATE_ASSETS');
      if (!assetId || typeof metadataPatch !== 'object') throw new PluginInputError("SDK Input Exception: Asset ID and object patch required");

      const asset = await db.asset.findUnique({ where: { id: assetId } });
      if (!asset) throw new PluginSystemError("SDK Relation Error: Asset not found.");

      const mergedMetadata = {
         ...(asset.metadata && typeof asset.metadata === 'object' ? asset.metadata : {}),
         ...metadataPatch
      };

      const updated = await db.asset.update({
        where: { id: assetId },
        data: { 
          metadata: mergedMetadata,
          auditLogs: {
            create: { action: `[PLUGIN:${ctx.pluginId}] METADATA_PATCHED`, userId, changes: metadataPatch }
          }
        }
      });

      await ctx.triggerHook('onAssetUpdated', updated);
      return updated;
    }),

    deleteAsset: withPluginErrorHandling(async (id: string) => {
      const userId = ctx.requireBotUser('DELETE_ASSETS');
      if (!id || typeof id !== 'string') throw new PluginInputError("SDK Input Exception: ID must be a string");
      
      const [del] = await db.$transaction([
        db.asset.delete({ where: { id } }),
        db.auditLog.create({
           data: { action: `[PLUGIN:${ctx.pluginId}] ENTITY_DELETED`, entityType: "Asset", entityId: id, userId, changes: { status: "PURGED" } }
        })
      ]);
      await ctx.triggerHook('onAssetDestroyed', id);
      return del;
    })
  }
}
