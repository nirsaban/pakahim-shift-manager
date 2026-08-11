-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SHIBUTZ', 'TEAM_LEAD', 'TAKAHIM');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('SCHEDULED', 'STARTED', 'COMPLETED', 'CANCELLED', 'HOLIDAY', 'SICK');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('PENDING', 'VALIDATED', 'IMPORTED', 'FAILED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subscriptionPlan" TEXT NOT NULL DEFAULT 'free',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "city" TEXT,
    "workerNumber" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'TAKAHIM',
    "teamId" TEXT,
    "fcmToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teamLeadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'SCHEDULED',
    "replacementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "teamLeadId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "severity" TEXT NOT NULL DEFAULT 'normal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_files" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "status" "FileStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "importedShiftCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_workerNumber_key" ON "users"("tenantId", "workerNumber");

-- CreateIndex
CREATE INDEX "teams_tenantId_idx" ON "teams"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_tenantId_name_key" ON "teams"("tenantId", "name");

-- CreateIndex
CREATE INDEX "shifts_tenantId_idx" ON "shifts"("tenantId");

-- CreateIndex
CREATE INDEX "shifts_workerId_idx" ON "shifts"("workerId");

-- CreateIndex
CREATE INDEX "shifts_teamId_idx" ON "shifts"("teamId");

-- CreateIndex
CREATE INDEX "shifts_date_idx" ON "shifts"("date");

-- CreateIndex
CREATE INDEX "incidents_tenantId_idx" ON "incidents"("tenantId");

-- CreateIndex
CREATE INDEX "incidents_workerId_idx" ON "incidents"("workerId");

-- CreateIndex
CREATE INDEX "incidents_teamLeadId_idx" ON "incidents"("teamLeadId");

-- CreateIndex
CREATE INDEX "shift_files_tenantId_idx" ON "shift_files"("tenantId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_teamLeadId_fkey" FOREIGN KEY ("teamLeadId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_teamLeadId_fkey" FOREIGN KEY ("teamLeadId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
