-- CreateTable
CREATE TABLE "Emails" (
    "id" SERIAL NOT NULL,
    "site_id" TEXT NOT NULL,
    "email_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "seen" BOOLEAN NOT NULL DEFAULT false,
    "click" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteProjects" (
    "id" SERIAL NOT NULL,
    "inviterName" INTEGER,
    "snederInvite" INTEGER NOT NULL,
    "toUserInvetId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "workspaceName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "InviteProjects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Emails_site_id_key" ON "Emails"("site_id");

-- CreateIndex
CREATE UNIQUE INDEX "Emails_email_id_key" ON "Emails"("email_id");

-- CreateIndex
CREATE INDEX "Emails_email_idx" ON "Emails"("email");

-- CreateIndex
CREATE INDEX "Emails_email_id_idx" ON "Emails"("email_id");

-- CreateIndex
CREATE INDEX "Emails_site_id_idx" ON "Emails"("site_id");

-- CreateIndex
CREATE INDEX "Emails_id_idx" ON "Emails"("id");

-- CreateIndex
CREATE UNIQUE INDEX "InviteProjects_site_id_key" ON "InviteProjects"("site_id");

-- CreateIndex
CREATE INDEX "InviteProjects_site_id_idx" ON "InviteProjects"("site_id");

-- CreateIndex
CREATE INDEX "InviteProjects_id_idx" ON "InviteProjects"("id");

-- CreateIndex
CREATE INDEX "InviteProjects_projectId_idx" ON "InviteProjects"("projectId");

-- AddForeignKey
ALTER TABLE "InviteProjects" ADD CONSTRAINT "InviteProjects_snederInvite_fkey" FOREIGN KEY ("snederInvite") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteProjects" ADD CONSTRAINT "InviteProjects_toUserInvetId_fkey" FOREIGN KEY ("toUserInvetId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteProjects" ADD CONSTRAINT "InviteProjects_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteProjects" ADD CONSTRAINT "InviteProjects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
