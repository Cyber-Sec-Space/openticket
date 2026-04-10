-- CreateEnum
CREATE TYPE "VulnAssetStatus" AS ENUM ('AFFECTED', 'MITIGATED', 'PATCHED', 'FALSE_POSITIVE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AssetType" ADD VALUE 'REPOSITORY';
ALTER TYPE "AssetType" ADD VALUE 'CLOUD_RESOURCE';
ALTER TYPE "AssetType" ADD VALUE 'DOMAIN';
ALTER TYPE "AssetType" ADD VALUE 'IAM_ROLE';
ALTER TYPE "AssetType" ADD VALUE 'SAAS_APP';
ALTER TYPE "AssetType" ADD VALUE 'CONTAINER';

-- AlterEnum
BEGIN;
CREATE TYPE "Permission_new" AS ENUM ('VIEW_INCIDENTS_ALL', 'VIEW_INCIDENTS_ASSIGNED', 'VIEW_INCIDENTS_UNASSIGNED', 'CREATE_INCIDENTS', 'UPDATE_INCIDENTS_METADATA', 'UPDATE_INCIDENT_STATUS_RESOLVE', 'UPDATE_INCIDENT_STATUS_CLOSE', 'ASSIGN_INCIDENTS_SELF', 'ASSIGN_INCIDENTS_OTHERS', 'LINK_INCIDENT_TO_ASSET', 'UPLOAD_INCIDENT_ATTACHMENTS', 'DELETE_INCIDENT_ATTACHMENTS', 'DELETE_INCIDENTS', 'EXPORT_INCIDENTS', 'ADD_COMMENTS', 'DELETE_OWN_COMMENTS', 'DELETE_ANY_COMMENTS', 'VIEW_ASSETS', 'CREATE_ASSETS', 'UPDATE_ASSETS', 'DELETE_ASSETS', 'VIEW_VULNERABILITIES', 'CREATE_VULNERABILITIES', 'UPDATE_VULNERABILITIES', 'DELETE_VULNERABILITIES', 'ASSIGN_VULNERABILITIES_SELF', 'ASSIGN_VULNERABILITIES_OTHERS', 'LINK_VULN_TO_ASSET', 'UPLOAD_VULN_ATTACHMENTS', 'DELETE_VULN_ATTACHMENTS', 'VIEW_USERS', 'CREATE_USERS', 'UPDATE_USER_PROFILE', 'ASSIGN_USER_ROLES', 'RESET_USER_PASSWORDS', 'SUSPEND_USERS', 'DELETE_USERS', 'VIEW_ROLES', 'CREATE_ROLES', 'UPDATE_ROLES', 'DELETE_ROLES', 'VIEW_DASHBOARD', 'VIEW_SYSTEM_SETTINGS', 'UPDATE_SYSTEM_SETTINGS', 'MANAGE_INTEGRATIONS', 'VIEW_PLUGINS', 'INSTALL_PLUGINS', 'TOGGLE_PLUGINS', 'CONFIGURE_PLUGINS', 'RESTART_SYSTEM_SERVICES', 'VIEW_AUDIT_LOGS', 'ACCESS_API', 'VIEW_API_TOKENS', 'ISSUE_API_TOKENS', 'REVOKE_API_TOKENS');
ALTER TABLE "CustomRole" ALTER COLUMN "permissions" TYPE "Permission_new"[] USING ("permissions"::text::"Permission_new"[]);
ALTER TYPE "Permission" RENAME TO "Permission_old";
ALTER TYPE "Permission_new" RENAME TO "Permission";
DROP TYPE "public"."Permission_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "_AssetVulnerabilities" DROP CONSTRAINT "_AssetVulnerabilities_A_fkey";

-- DropForeignKey
ALTER TABLE "_AssetVulnerabilities" DROP CONSTRAINT "_AssetVulnerabilities_B_fkey";

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "vulnId" TEXT,
ALTER COLUMN "incidentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SystemSetting" ADD COLUMN     "soarAutoQuarantineEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "soarAutoQuarantineThreshold" "Severity" NOT NULL DEFAULT 'CRITICAL';

-- DropTable
DROP TABLE "_AssetVulnerabilities";

-- CreateTable
CREATE TABLE "VulnerabilityAsset" (
    "id" TEXT NOT NULL,
    "vulnId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "status" "VulnAssetStatus" NOT NULL DEFAULT 'AFFECTED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VulnerabilityAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_VulnAssignees" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_VulnAssignees_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "VulnerabilityAsset_vulnId_assetId_key" ON "VulnerabilityAsset"("vulnId", "assetId");

-- CreateIndex
CREATE INDEX "_VulnAssignees_B_index" ON "_VulnAssignees"("B");

-- CreateIndex
CREATE INDEX "Asset_name_idx" ON "Asset"("name");

-- CreateIndex
CREATE INDEX "Asset_ipAddress_idx" ON "Asset"("ipAddress");

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");

-- CreateIndex
CREATE INDEX "Incident_severity_idx" ON "Incident"("severity");

-- CreateIndex
CREATE INDEX "Incident_title_idx" ON "Incident"("title");

-- CreateIndex
CREATE INDEX "Vulnerability_severity_idx" ON "Vulnerability"("severity");

-- CreateIndex
CREATE INDEX "Vulnerability_status_idx" ON "Vulnerability"("status");

-- AddForeignKey
ALTER TABLE "VulnerabilityAsset" ADD CONSTRAINT "VulnerabilityAsset_vulnId_fkey" FOREIGN KEY ("vulnId") REFERENCES "Vulnerability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VulnerabilityAsset" ADD CONSTRAINT "VulnerabilityAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_vulnId_fkey" FOREIGN KEY ("vulnId") REFERENCES "Vulnerability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VulnAssignees" ADD CONSTRAINT "_VulnAssignees_A_fkey" FOREIGN KEY ("A") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VulnAssignees" ADD CONSTRAINT "_VulnAssignees_B_fkey" FOREIGN KEY ("B") REFERENCES "Vulnerability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

