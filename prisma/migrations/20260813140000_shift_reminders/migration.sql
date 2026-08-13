-- CreateEnum
CREATE TYPE "ReminderSound" AS ENUM ('CHIME', 'BELL', 'ALARM', 'SILENT');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "shiftReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "shiftReminderLeadMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "shiftReminderSound" "ReminderSound" NOT NULL DEFAULT 'CHIME';

-- CreateTable
CREATE TABLE "shift_reminders" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leadMinutes" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shift_reminders_sentAt_idx" ON "shift_reminders"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "shift_reminders_shiftId_userId_key" ON "shift_reminders"("shiftId", "userId");

-- AddForeignKey
ALTER TABLE "shift_reminders" ADD CONSTRAINT "shift_reminders_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_reminders" ADD CONSTRAINT "shift_reminders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

