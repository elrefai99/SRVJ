-- AlterTable
ALTER TABLE "users" ADD COLUMN     "session_version" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "InviteProjects_email_idx" ON "InviteProjects"("email");

-- CreateIndex
CREATE INDEX "InviteProjects_email_status_idx" ON "InviteProjects"("email", "status");

-- CreateIndex
CREATE INDEX "projects_ownerId_status_createdAt_idx" ON "projects"("ownerId", "status", "createdAt");
