/*
  Warnings:

  - You are about to drop the column `assetId` on the `Incident` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "MailerProvider" AS ENUM ('SMTP', 'RESEND', 'SENDGRID');

-- DropForeignKey
ALTER TABLE "Incident" DROP CONSTRAINT "Incident_assetId_fkey";

-- AlterTable
ALTER TABLE "Incident" DROP COLUMN "assetId";

-- AlterTable
ALTER TABLE "SystemSetting" ADD COLUMN     "allowPasswordReset" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mailerApiKey" TEXT,
ADD COLUMN     "mailerProvider" "MailerProvider" NOT NULL DEFAULT 'SMTP',
ADD COLUMN     "vulnSlaCriticalHours" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN     "vulnSlaHighHours" INTEGER NOT NULL DEFAULT 48,
ADD COLUMN     "vulnSlaInfoHours" INTEGER NOT NULL DEFAULT 720,
ADD COLUMN     "vulnSlaLowHours" INTEGER NOT NULL DEFAULT 336,
ADD COLUMN     "vulnSlaMediumHours" INTEGER NOT NULL DEFAULT 168;

-- CreateTable
CREATE TABLE "_IncidentAssets" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_IncidentAssets_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_IncidentAssets_B_index" ON "_IncidentAssets"("B");

-- AddForeignKey
ALTER TABLE "_IncidentAssets" ADD CONSTRAINT "_IncidentAssets_A_fkey" FOREIGN KEY ("A") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IncidentAssets" ADD CONSTRAINT "_IncidentAssets_B_fkey" FOREIGN KEY ("B") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
