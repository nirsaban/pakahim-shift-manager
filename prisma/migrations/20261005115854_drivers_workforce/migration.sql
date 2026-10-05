-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'DRIVER';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isRosterAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "driver_duties" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "serial" INTEGER NOT NULL,
    "mirs" TEXT,
    "originStation" TEXT,
    "task" TEXT NOT NULL,
    "trainNumbers" TEXT[],
    "companionRole" TEXT,
    "companionName" TEXT,
    "companionWorkerNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_duties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "driver_duties_shiftId_key" ON "driver_duties"("shiftId");

-- CreateIndex
CREATE INDEX "driver_duties_tenantId_idx" ON "driver_duties"("tenantId");

-- AddForeignKey
ALTER TABLE "driver_duties" ADD CONSTRAINT "driver_duties_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_duties" ADD CONSTRAINT "driver_duties_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
