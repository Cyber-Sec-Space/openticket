import { db } from "@/lib/db"
import { AssetType, AssetStatus } from "@prisma/client"
import { PluginSystemError, PluginInputError, withPluginErrorHandling } from './errors'
import { SdkExecutionContext } from './sdk-types'
import { AssetCreateSchema, AssetSearchSchema, AssetUpdateSchema } from './schemas'
import { z } from "zod"

const IdSchema = z.string().min(1, "ID is required");

export function createAssetApi(ctx: SdkExecutionContext) {
  return {
    createAsset: withPluginErrorHandling(async (name: string, type: AssetType, ipAddress?: string, externalId?: string, metadata?: Record<string, unknown>) => {
      const id = ctx.requireBotUser('CREATE_ASSETS');
      
      const parsedData = AssetCreateSchema.parse({ name, type, ipAddress, externalId, metadata });

      const asset = await db.asset.create({
        data: { 
          name: parsedData.name, 
          type: parsedData.type as AssetType, 
          ipAddress: parsedData.ipAddress, 
          externalId: parsedData.externalId, 
          metadata: parsedData.metadata
        }
      });

      await db.auditLog.create({
        data: { action: `[PLUGIN:${ctx.pluginId}] ASSET_CREATED`, entityType: 'Asset', entityId: asset.id, userId: id, changes: { name: parsedData.name, type: parsedData.type, ipAddress: parsedData.ipAddress, externalId: parsedData.externalId } }
      });
      
      await ctx.triggerHook('onAssetCreated', asset);
      return asset;
    }),

    getAsset: withPluginErrorHandling(async (assetId: string) => {
      ctx.requireBotUser('VIEW_ASSETS');
      const validId = IdSchema.parse(assetId);
      
      return await db.asset.findUnique({ where: { id: validId } });
    }),

    getAssetByIp: withPluginErrorHandling(async (ipAddress: string) => {
      ctx.requireBotUser('VIEW_ASSETS');
      const validIp = z.string().min(1).parse(ipAddress);

      return await db.asset.findFirst({
        where: { ipAddress: validIp }
      });
    }),

    getAssetByIdentifier: withPluginErrorHandling(async (identifier: string) => {
      ctx.requireBotUser('VIEW_ASSETS');
      const validId = z.string().min(1).parse(identifier);

      return await db.asset.findFirst({
        where: { externalId: validId }
      });
    }),

    searchAssets: withPluginErrorHandling(async (query?: { type?: AssetType, status?: AssetStatus, limit?: number }) => {
      ctx.requireBotUser('VIEW_ASSETS');
      const parsedQuery = query ? AssetSearchSchema.parse(query) : { limit: 50 };
      
      const conditions: any = {};
      if (parsedQuery.type) conditions.type = parsedQuery.type;
      if (parsedQuery.status) conditions.status = parsedQuery.status;

      return await db.asset.findMany({ where: conditions, take: parsedQuery.limit });
    }),

    updateAssetDetails: withPluginErrorHandling(async (assetId: string, updates: { name?: string, type?: AssetType, ipAddress?: string | null, externalId?: string | null }) => {
      const id = ctx.requireBotUser('UPDATE_ASSETS');
      const validId = IdSchema.parse(assetId);
      const parsedUpdates = AssetUpdateSchema.parse(updates);

      const updated = await db.asset.update({
        where: { id: validId },
        data: {
          ...parsedUpdates
        }
      });

      await db.auditLog.create({
        data: { action: `[PLUGIN:${ctx.pluginId}] ASSET_UPDATED`, entityType: 'Asset', entityId: validId, userId: id, changes: parsedUpdates }
      });
      
      await ctx.triggerHook('onAssetUpdated', updated);
      return updated;
    }),

    updateAssetStatus: withPluginErrorHandling(async (assetId: string, status: AssetStatus) => {
      const id = ctx.requireBotUser('UPDATE_ASSETS');
      const validId = IdSchema.parse(assetId);
      z.string().min(1).parse(status);

      const updated = await db.asset.update({
        where: { id: validId },
        data: { 
          status
        }
      });

      await db.auditLog.create({
        data: { action: `[PLUGIN:${ctx.pluginId}] ASSET_STATUS_UPDATED`, entityType: 'Asset', entityId: validId, userId: id, changes: { status } }
      });

      await ctx.triggerHook('onAssetUpdated', updated);
      return updated;
    }),

    updateAssetMetadata: withPluginErrorHandling(async (assetId: string, metadataPatch: Record<string, unknown>) => {
      const userId = ctx.requireBotUser('UPDATE_ASSETS');
      const validId = IdSchema.parse(assetId);
      const parsedPatch = z.record(z.string(), z.unknown()).parse(metadataPatch);

      const asset = await db.asset.findUnique({ where: { id: validId } });
      if (!asset) throw new PluginSystemError("SDK Relation Error: Asset not found.");

      const mergedMetadata = {
         ...(asset.metadata && typeof asset.metadata === 'object' ? asset.metadata : {}),
         ...parsedPatch
      };

      const updated = await db.asset.update({
        where: { id: validId },
        data: { 
          metadata: mergedMetadata
        }
      });

      await db.auditLog.create({
        data: { action: `[PLUGIN:${ctx.pluginId}] METADATA_PATCHED`, entityType: 'Asset', entityId: validId, userId, changes: parsedPatch }
      });

      await ctx.triggerHook('onAssetUpdated', updated);
      return updated;
    }),

    deleteAsset: withPluginErrorHandling(async (id: string) => {
      const userId = ctx.requireBotUser('DELETE_ASSETS');
      const validId = IdSchema.parse(id);
      
      const [del] = await db.$transaction([
        db.asset.delete({ where: { id: validId } }),
        db.auditLog.create({
           data: { action: `[PLUGIN:${ctx.pluginId}] ENTITY_DELETED`, entityType: "Asset", entityId: validId, userId, changes: { status: "PURGED" } }
        })
      ]);
      await ctx.triggerHook('onAssetDestroyed', validId);
      return del;
    })
  }
}

