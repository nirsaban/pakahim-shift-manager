-- CreateEnum
CREATE TYPE "HomeStationSource" AS ENUM ('SELF_SELECTED', 'DERIVED_FROM_CITY', 'ADMIN_SET', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AliasKind" AS ENUM ('SHIFT_TOKEN', 'ROUTE_NOTE', 'CITY');

-- CreateEnum
CREATE TYPE "DutyParseStatus" AS ENUM ('OK', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "StationSource" AS ENUM ('EXPLICIT_TOKEN', 'ROUTE_NOTE', 'DEFAULT_LOD', 'INFERRED_TRANSFER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DutyLegKind" AS ENUM ('TRAIN', 'TRANSIT', 'STANDBY', 'OPS', 'TAXI', 'INSPECTION', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SwapKind" AS ENUM ('ABSORB_HANDOFF', 'SWAP_DUTIES', 'FILL_OPEN_DUTY');

-- CreateEnum
CREATE TYPE "SwapStatus" AS ENUM ('NEW', 'DISMISSED', 'CONVERTED', 'SUPERSEDED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "homeStationId" TEXT,
ADD COLUMN     "homeStationSource" "HomeStationSource" NOT NULL DEFAULT 'UNKNOWN';

-- CreateTable
CREATE TABLE "stations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL,
    "isUncertain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "station_aliases" (
    "id" TEXT NOT NULL,
    "kind" "AliasKind" NOT NULL,
    "normalized" TEXT NOT NULL,
    "raw" TEXT NOT NULL,
    "stationId" TEXT,
    "seenCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "station_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "train_lines" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL,
    "rangeStart" INTEGER NOT NULL,
    "rangeEnd" INTEGER NOT NULL,
    "isUncertain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "train_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "train_line_stops" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,

    CONSTRAINT "train_line_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duties" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "section" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "isReinforcement" BOOLEAN NOT NULL DEFAULT false,
    "startMinutes" INTEGER,
    "endMinutes" INTEGER,
    "shiftString" TEXT NOT NULL,
    "routeNote" TEXT,
    "remarks" TEXT,
    "trailingNote" TEXT,
    "workerNumber" TEXT,
    "workerName" TEXT,
    "mirs" TEXT,
    "templateHash" TEXT NOT NULL,
    "parseStatus" "DutyParseStatus" NOT NULL DEFAULT 'OK',
    "parseWarnings" JSONB,
    "firstActiveTrain" TEXT,
    "lastActiveTrain" TEXT,
    "startStation" TEXT,
    "startSource" "StationSource" NOT NULL DEFAULT 'UNKNOWN',
    "endStation" TEXT,
    "endSource" "StationSource" NOT NULL DEFAULT 'UNKNOWN',
    "finalStation" TEXT,
    "shiftId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "duties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duty_legs" (
    "id" TEXT NOT NULL,
    "dutyId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "kind" "DutyLegKind" NOT NULL,
    "isDuty" BOOLEAN NOT NULL,
    "rawTokens" TEXT[],
    "trainNumber" TEXT,
    "lineCode" TEXT,
    "isServiceMove" BOOLEAN NOT NULL DEFAULT false,
    "opCode" TEXT,
    "opOperands" TEXT[],
    "atMinutes" INTEGER,
    "fromStation" TEXT,
    "fromSource" "StationSource" NOT NULL DEFAULT 'UNKNOWN',
    "toStation" TEXT,
    "toSource" "StationSource" NOT NULL DEFAULT 'UNKNOWN',

    CONSTRAINT "duty_legs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handoffs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "section" TEXT NOT NULL,
    "trainNumber" TEXT NOT NULL,
    "predecessorDutyId" TEXT NOT NULL,
    "successorDutyId" TEXT NOT NULL,
    "station" TEXT,
    "predecessorEndMinutes" INTEGER NOT NULL,
    "successorStartMinutes" INTEGER NOT NULL,
    "gapMinutes" INTEGER NOT NULL,
    "isReinforcement" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "bothSidesDeadhead" BOOLEAN NOT NULL DEFAULT false,
    "predecessorExitTrain" TEXT,
    "successorEntryTrain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "handoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "swap_suggestions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "kind" "SwapKind" NOT NULL,
    "handoffId" TEXT,
    "dutyAId" TEXT NOT NULL,
    "dutyBId" TEXT NOT NULL,
    "workerAId" TEXT,
    "workerBId" TEXT,
    "score" DOUBLE PRECISION NOT NULL,
    "savedMinutes" INTEGER NOT NULL,
    "rationale" JSONB NOT NULL,
    "evidence" JSONB NOT NULL,
    "status" "SwapStatus" NOT NULL DEFAULT 'NEW',
    "dismissedById" TEXT,
    "coverageRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "swap_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stations_code_key" ON "stations"("code");

-- CreateIndex
CREATE INDEX "station_aliases_stationId_idx" ON "station_aliases"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "station_aliases_kind_normalized_key" ON "station_aliases"("kind", "normalized");

-- CreateIndex
CREATE UNIQUE INDEX "train_lines_code_key" ON "train_lines"("code");

-- CreateIndex
CREATE INDEX "train_line_stops_stationId_idx" ON "train_line_stops"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "train_line_stops_lineId_ordinal_key" ON "train_line_stops"("lineId", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "duties_shiftId_key" ON "duties"("shiftId");

-- CreateIndex
CREATE INDEX "duties_tenantId_date_idx" ON "duties"("tenantId", "date");

-- CreateIndex
CREATE INDEX "duties_tenantId_templateHash_idx" ON "duties"("tenantId", "templateHash");

-- CreateIndex
CREATE INDEX "duties_tenantId_date_lastActiveTrain_idx" ON "duties"("tenantId", "date", "lastActiveTrain");

-- CreateIndex
CREATE INDEX "duties_tenantId_date_firstActiveTrain_idx" ON "duties"("tenantId", "date", "firstActiveTrain");

-- CreateIndex
CREATE UNIQUE INDEX "duties_tenantId_date_section_serial_key" ON "duties"("tenantId", "date", "section", "serial");

-- CreateIndex
CREATE INDEX "duty_legs_trainNumber_idx" ON "duty_legs"("trainNumber");

-- CreateIndex
CREATE UNIQUE INDEX "duty_legs_dutyId_seq_key" ON "duty_legs"("dutyId", "seq");

-- CreateIndex
CREATE INDEX "handoffs_tenantId_date_idx" ON "handoffs"("tenantId", "date");

-- CreateIndex
CREATE INDEX "handoffs_successorDutyId_idx" ON "handoffs"("successorDutyId");

-- CreateIndex
CREATE UNIQUE INDEX "handoffs_tenantId_date_predecessorDutyId_successorDutyId_key" ON "handoffs"("tenantId", "date", "predecessorDutyId", "successorDutyId");

-- CreateIndex
CREATE INDEX "swap_suggestions_tenantId_date_status_idx" ON "swap_suggestions"("tenantId", "date", "status");

-- CreateIndex
CREATE INDEX "swap_suggestions_tenantId_score_idx" ON "swap_suggestions"("tenantId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "swap_suggestions_tenantId_date_kind_dutyAId_dutyBId_key" ON "swap_suggestions"("tenantId", "date", "kind", "dutyAId", "dutyBId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_homeStationId_fkey" FOREIGN KEY ("homeStationId") REFERENCES "stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "station_aliases" ADD CONSTRAINT "station_aliases_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "train_line_stops" ADD CONSTRAINT "train_line_stops_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "train_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "train_line_stops" ADD CONSTRAINT "train_line_stops_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duties" ADD CONSTRAINT "duties_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duties" ADD CONSTRAINT "duties_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duty_legs" ADD CONSTRAINT "duty_legs_dutyId_fkey" FOREIGN KEY ("dutyId") REFERENCES "duties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handoffs" ADD CONSTRAINT "handoffs_predecessorDutyId_fkey" FOREIGN KEY ("predecessorDutyId") REFERENCES "duties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handoffs" ADD CONSTRAINT "handoffs_successorDutyId_fkey" FOREIGN KEY ("successorDutyId") REFERENCES "duties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swap_suggestions" ADD CONSTRAINT "swap_suggestions_handoffId_fkey" FOREIGN KEY ("handoffId") REFERENCES "handoffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swap_suggestions" ADD CONSTRAINT "swap_suggestions_dutyAId_fkey" FOREIGN KEY ("dutyAId") REFERENCES "duties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swap_suggestions" ADD CONSTRAINT "swap_suggestions_dutyBId_fkey" FOREIGN KEY ("dutyBId") REFERENCES "duties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
