-- CreateIndex
CREATE INDEX "diagram_versions_createdAt_idx" ON "diagram_versions"("createdAt");

-- CreateIndex
CREATE INDEX "diagrams_createdAt_idx" ON "diagrams"("createdAt");

-- CreateIndex
CREATE INDEX "project_members_createdAt_idx" ON "project_members"("createdAt");

-- CreateIndex
CREATE INDEX "projects_createdAt_idx" ON "projects"("createdAt");

-- CreateIndex
CREATE INDEX "share_links_createdAt_idx" ON "share_links"("createdAt");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");
