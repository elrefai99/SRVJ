/*
  Warnings:

  - A unique constraint covering the columns `[diagramId,version]` on the table `diagram_versions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `diagram_versions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `share_links` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "diagram_versions_version_idx";

-- AlterTable
ALTER TABLE "diagram_versions" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "share_links" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "site_id" TEXT NOT NULL,
    "fromUserId" INTEGER,
    "toUserId" INTEGER,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notifications_site_id_key" ON "notifications"("site_id");

-- CreateIndex
CREATE INDEX "notifications_toUserId_isRead_idx" ON "notifications"("toUserId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "diagram_versions_diagramId_version_key" ON "diagram_versions"("diagramId", "version");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
