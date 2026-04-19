import { z } from "zod";
import { Severity, AssetType, AssetStatus, VulnStatus, VulnAssetStatus } from "@prisma/client";

// Reusable Enum Mappings
const SeverityEnum = z.enum(["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const AssetTypeEnum = z.enum(["HARDWARE", "SOFTWARE", "NETWORK", "CLOUD", "DATA", "OTHER"]);
const AssetStatusEnum = z.enum(["ACTIVE", "INACTIVE", "DECOMMISSIONED", "COMPROMISED", "MAINTENANCE"]);
const VulnStatusEnum = z.enum(["OPEN", "MITIGATED", "RESOLVED", "ACCEPTED", "FALSE_POSITIVE"]);
const VulnAssetStatusEnum = z.enum(["AFFECTED", "MITIGATED", "PATCHED", "EXPLOITED"]);

// -----------------------------------------------------
// Incident Schemas
// -----------------------------------------------------
export const IncidentCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().min(1, "Description is required"),
  type: z.string().optional().default("OTHER"),
  severity: SeverityEnum.optional().default("LOW"),
  assetIds: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([])
});

export const IncidentUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  severity: SeverityEnum.optional(),
  assetIds: z.array(z.string()).optional()
});

export const IncidentSearchSchema = z.object({
  severity: SeverityEnum.optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(100).optional().default(50)
});

// -----------------------------------------------------
// Vulnerability Schemas
// -----------------------------------------------------
export const VulnCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().min(1, "Description is required"),
  severity: SeverityEnum,
  targetAssetId: z.string().min(1, "Target Asset ID is required"),
  options: z.object({
    cveId: z.string().optional(),
    cvssScore: z.number().min(0).max(10).optional()
  }).optional()
});

export const VulnUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  severity: SeverityEnum.optional(),
  cveId: z.string().nullable().optional(),
  cvssScore: z.number().min(0).max(10).nullable().optional()
});

export const VulnSearchSchema = z.object({
  severity: SeverityEnum.optional(),
  status: VulnStatusEnum.optional(),
  limit: z.number().int().min(1).max(100).optional().default(50)
});

// -----------------------------------------------------
// Asset Schemas
// -----------------------------------------------------
export const AssetCreateSchema = z.object({
  name: z.string().min(1, "Asset name is required").max(255),
  type: AssetTypeEnum,
  ipAddress: z.string().optional(),
  externalId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({})
});

export const AssetUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: AssetTypeEnum.optional(),
  ipAddress: z.string().nullable().optional(),
  externalId: z.string().nullable().optional()
});

export const AssetSearchSchema = z.object({
  type: AssetTypeEnum.optional(),
  status: AssetStatusEnum.optional(),
  limit: z.number().int().min(1).max(100).optional().default(50)
});

// -----------------------------------------------------
// User Schemas
// -----------------------------------------------------
export const UserCreateSchema = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().min(1, "Name is required").max(255),
  assignRoleNames: z.array(z.string()).optional()
});

// -----------------------------------------------------
// Telemetry Schemas
// -----------------------------------------------------
export const NotificationCreateSchema = z.object({
  targetUserId: z.string().min(1, "Target User ID is required"),
  title: z.string().min(1, "Title is required").max(100),
  body: z.string().min(1, "Body is required").max(500),
  link: z.string().optional()
});
