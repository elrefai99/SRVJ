/*
  Warnings:

  - You are about to drop the `diagram_versions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `diagrams` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "diagram_versions" DROP CONSTRAINT "diagram_versions_createdById_fkey";

-- DropForeignKey
ALTER TABLE "diagram_versions" DROP CONSTRAINT "diagram_versions_diagramId_fkey";

-- DropForeignKey
ALTER TABLE "diagrams" DROP CONSTRAINT "diagrams_projectId_fkey";

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "diagram" TEXT;

-- DropTable
DROP TABLE "diagram_versions";

-- DropTable
DROP TABLE "diagrams";
