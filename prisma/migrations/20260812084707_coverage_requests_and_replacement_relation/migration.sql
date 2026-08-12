-- CreateEnum
CREATE TYPE "CoverageReason" AS ENUM ('SICK', 'HOLIDAY', 'SWAP', 'OTHER');

-- CreateEnum
CREATE TYPE "CoverageRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "coverage_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reason" "CoverageReason" NOT NULL,
    "note" TEXT,
    "proposedReplacementId" TEXT,
    "status" "CoverageRequestStatus" NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coverage_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coverage_requests_tenantId_idx" ON "coverage_requests"("tenantId");

-- CreateIndex
CREATE INDEX "coverage_requests_shiftId_idx" ON "coverage_requests"("shiftId");

-- CreateIndex
CREATE INDEX "coverage_requests_requestedById_idx" ON "coverage_requests"("requestedById");

-- CreateIndex
CREATE INDEX "coverage_requests_status_idx" ON "coverage_requests"("status");

-- CreateIndex
CREATE INDEX "shifts_replacementId_idx" ON "shifts"("replacementId");

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_replacementId_fkey" FOREIGN KEY ("replacementId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coverage_requests" ADD CONSTRAINT "coverage_requests_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coverage_requests" ADD CONSTRAINT "coverage_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coverage_requests" ADD CONSTRAINT "coverage_requests_proposedReplacementId_fkey" FOREIGN KEY ("proposedReplacementId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coverage_requests" ADD CONSTRAINT "coverage_requests_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
