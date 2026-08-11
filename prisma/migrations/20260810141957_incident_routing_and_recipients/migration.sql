-- CreateEnum
CREATE TYPE "IncidentRoute" AS ENUM ('TEAM_LEAD', 'MAINTENANCE', 'EMERGENCY_BROADCAST');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'MAINTENANCE';

-- AlterTable
ALTER TABLE "incidents" ADD COLUMN     "route" "IncidentRoute" NOT NULL DEFAULT 'TEAM_LEAD';

-- CreateTable
CREATE TABLE "incident_recipients" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "incident_recipients_incidentId_idx" ON "incident_recipients"("incidentId");

-- CreateIndex
CREATE INDEX "incident_recipients_userId_idx" ON "incident_recipients"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "incident_recipients_incidentId_userId_key" ON "incident_recipients"("incidentId", "userId");

-- AddForeignKey
ALTER TABLE "incident_recipients" ADD CONSTRAINT "incident_recipients_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_recipients" ADD CONSTRAINT "incident_recipients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
