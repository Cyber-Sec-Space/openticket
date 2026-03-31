/*
  Warnings:

  - You are about to drop the column `assigneeId` on the `Incident` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Incident" DROP CONSTRAINT "Incident_assigneeId_fkey";

-- AlterTable
ALTER TABLE "Incident" DROP COLUMN "assigneeId";

-- CreateTable
CREATE TABLE "_IncidentAssignees" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_IncidentAssignees_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_IncidentAssignees_B_index" ON "_IncidentAssignees"("B");

-- AddForeignKey
ALTER TABLE "_IncidentAssignees" ADD CONSTRAINT "_IncidentAssignees_A_fkey" FOREIGN KEY ("A") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IncidentAssignees" ADD CONSTRAINT "_IncidentAssignees_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
