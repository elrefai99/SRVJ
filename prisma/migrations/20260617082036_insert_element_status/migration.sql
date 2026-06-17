-- CreateEnum
CREATE TYPE "tableStatus" AS ENUM ('active', 'inactive', 'delete', 'ban');

-- AlterTable
ALTER TABLE "project_members" ADD COLUMN     "status" "tableStatus" NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "status" "tableStatus" NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "status" "tableStatus" NOT NULL DEFAULT 'active';
