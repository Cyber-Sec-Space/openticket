/*
  Warnings:

  - A unique constraint covering the columns `[botPluginIdentifier]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "botPluginIdentifier" TEXT,
ADD COLUMN     "isBot" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "User_botPluginIdentifier_key" ON "User"("botPluginIdentifier");
