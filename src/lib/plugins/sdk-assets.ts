import { db } from "@/lib/db"
import { AssetType, AssetStatus } from "@prisma/client"
import { PluginSystemError, PluginInputError } from './errors'
import { SdkExecutionContext } from './sdk-types'

export function createAssetApi(ctx: SdkExecutionContext) {
  return {
    createAsset: async (name: string, type: AssetType, ipAddress?: string, externalId?: string, metadata?: any) => {
      const id = ctx.requireBotUser('CREATE_ASSETS');
      if (!name || typeof name !== 'string') throw new PluginInputError("SDK Input Exception: Asset name required");

      try {
        const asset = await db.asset.create({
          data: { name, type, ipAddress, externalId, metadata: metadata || {} }
        });
        
        await db.auditLog.create({
          data: { action: `[PLUGIN:${ctx.pluginId}] ASSET_CREATED`, entityType: "Asset", entityId: asset.id, userId: id, changes: { name, type, ipAddress, externalId } }
        });

        await ctx.triggerHook('onAssetCreated', asset);
        return asset;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    getAsset: async (assetId: string) => {
      ctx.requireBotUser('VIEW_ASSETS');
      if (!assetId) throw new PluginInputError("SDK Input Exception: Asset ID required.");
      
      try {
        return await db.asset.findUnique({ where: { id: assetId } });
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    getAssetByIp: async (ipAddress: string) => {
      ctx.requireBotUser('VIEW_ASSETS');
      if (!ipAddress || typeof ipAddress !== 'string') throw new PluginInputError("SDK Input Exception: IP address required.");

      try {
        return await db.asset.findFirst({
          where: { ipAddress }
        });
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    getAssetByIdentifier: async (identifier: string) => {
      ctx.requireBotUser('VIEW_ASSETS');
      if (!identifier || typeof identifier !== 'string') throw new PluginInputError("SDK Input Exception: Identifier required.");

      try {
        return await db.asset.findFirst({
          where: { externalId: identifier }
        });
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    searchAssets: async (query?: { type?: AssetType, status?: AssetStatus, limit?: number }) => {
      ctx.requireBotUser('VIEW_ASSETS');
      try {
        const limit = Math.min(query?.limit || 50, 100);
        const conditions: any = {};
        if (query?.type) conditions.type = query.type;
        if (query?.status) conditions.status = query.status;

        return await db.asset.findMany({ where: conditions, take: limit });
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    updateAssetDetails: async (assetId: string, updates: { name?: string, type?: AssetType, ipAddress?: string | null, externalId?: string | null }) => {
      const id = ctx.requireBotUser('UPDATE_ASSETS');
      if (!assetId) throw new PluginInputError("SDK Input Exception: Asset ID required.");

      try {
        const updated = await db.asset.update({
          where: { id: assetId },
          data: updates
        });
        
        await db.auditLog.create({
           data: { action: `[PLUGIN:${ctx.pluginId}] ASSET_UPDATED`, entityType: "Asset", entityId: assetId, userId: id, changes: updates }
        });
        
        await ctx.triggerHook('onAssetUpdated', updated);
        return updated;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    updateAssetStatus: async (assetId: string, status: AssetStatus) => {
      const id = ctx.requireBotUser('UPDATE_ASSETS');
      if (!assetId || !status) throw new PluginInputError("SDK Input Exception: AssetId and Status are required.");

      try {
        const updated = await db.asset.update({
          where: { id: assetId },
          data: { status }
        });

        await db.auditLog.create({
          data: { action: `[PLUGIN:${ctx.pluginId}] ASSET_STATUS_UPDATED`, entityType: "Asset", entityId: assetId, userId: id, changes: { status } }
        });
        
        await ctx.triggerHook('onAssetUpdated', updated);
        return updated;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    updateAssetMetadata: async (assetId: string, metadataPatch: any) => {
      const userId = ctx.requireBotUser('UPDATE_ASSETS');
      if (!assetId || typeof metadataPatch !== 'object') throw new PluginInputError("SDK Input Exception: Asset ID and object patch required");

      try {
        const asset = await db.asset.findUnique({ where: { id: assetId } });
        if (!asset) throw new PluginSystemError("SDK Relation Error: Asset not found.");

        const mergedMetadata = {
           ...(asset.metadata && typeof asset.metadata === 'object' ? asset.metadata : {}),
           ...metadataPatch
        };

        const updated = await db.asset.update({
          where: { id: assetId },
          data: { metadata: mergedMetadata }
        });

        await db.auditLog.create({
           data: { action: `[PLUGIN:${ctx.pluginId}] METADATA_PATCHED`, entityType: "Asset", entityId: assetId, userId, changes: metadataPatch }
        });
        
        await ctx.triggerHook('onAssetUpdated', updated);
        return updated;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    },

    deleteAsset: async (id: string) => {
      const userId = ctx.requireBotUser('DELETE_ASSETS');
      if (!id || typeof id !== 'string') throw new PluginInputError("SDK Input Exception: ID must be a string");
      
      try {
        await db.auditLog.create({
           data: { action: `[PLUGIN:${ctx.pluginId}] ENTITY_DELETED`, entityType: "Asset", entityId: id, userId, changes: { status: "PURGED" } }
        });
        const del = await db.asset.delete({ where: { id } });
        await ctx.triggerHook('onAssetDestroyed', id);
        return del;
      } catch (error) { throw new PluginSystemError(`SDK DB Error: ${error instanceof Error ? error.message : "Failure"}`); }
    }
  }
}
