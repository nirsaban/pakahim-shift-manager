-- CreateEnum
CREATE TYPE "DriverDutySource" AS ENUM ('DAILY', 'WEEKLY');

-- AlterTable
ALTER TABLE "driver_duties" ADD COLUMN     "link" TEXT,
ADD COLUMN     "source" "DriverDutySource" NOT NULL DEFAULT 'DAILY',
ALTER COLUMN "serial" DROP NOT NULL;
