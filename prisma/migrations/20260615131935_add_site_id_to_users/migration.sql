/*
  Warnings:

  - A unique constraint covering the columns `[site_id]` on the table `diagram_versions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[site_id]` on the table `diagrams` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[site_id]` on the table `project_members` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[site_id]` on the table `projects` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[site_id]` on the table `share_links` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[site_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - The required column `site_id` was added to the `diagram_versions` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `site_id` was added to the `diagrams` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `site_id` was added to the `project_members` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `site_id` was added to the `projects` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `site_id` was added to the `share_links` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `site_id` was added to the `users` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "diagram_versions" ADD COLUMN     "site_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "diagrams" ADD COLUMN     "site_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "project_members" ADD COLUMN     "site_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "site_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "share_links" ADD COLUMN     "site_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "site_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "diagram_versions_site_id_key" ON "diagram_versions"("site_id");

-- CreateIndex
CREATE UNIQUE INDEX "diagrams_site_id_key" ON "diagrams"("site_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_site_id_key" ON "project_members"("site_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_site_id_key" ON "projects"("site_id");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_site_id_key" ON "share_links"("site_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_site_id_key" ON "users"("site_id");
