import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { ROSTER_TIME_ZONE, formatIsraelTime } from '../time/zone';

/**
 * Repair for shifts written before roster times were zone-aware, runnable from
 * the admin UI.
 *
 * There is a script for this too (scripts/fix-shift-timezone.ts), but it needs a
 * shell on the box. This exists because the shell is not always available when
 * the hours are wrong on someone's phone right now, and the repair is the same
 * four statements either way.
 *
 * WHAT IS BROKEN: the old importer built instants with local-time setters, so a
 * container running UTC stored a 04:00 roster line as 04:00Z - three hours late
 * in summer. It hid because the display was wrong in the same direction.
 *
 * THE DISCRIMINATOR: `Shift.date` at exactly 00:00:00 UTC. A roster date written
 * by the fixed importer is Israeli midnight (21:00 or 22:00 the day before), so
 * a repaired row can never be mistaken for a broken one - which is what makes
 * this safe to run twice, and safe to leave in the UI.
 *
 * THE CONVERSION: keep the wall-clock reading, re-anchor it to Israel. Done in
 * Postgres with AT TIME ZONE rather than a fixed three-hour interval, so the
 * winter rows (+2) and the two DST weekends come out right too.
 */

export interface TimezoneDiagnosis {
  /** What the app process thinks its zone is - unset means the container lost it. */
  processTimeZone: string | null;
  /** Now, as this process would render it, and as Israel actually reads it. */
  processClock: string;
  israelClock: string;
  /** True when the process is NOT rendering Israel time - a second, distinct fault. */
  processZoneWrong: boolean;
  shiftsNeedingRepair: number;
  shiftsAlreadyCorrect: number;
  dutiesNeedingRepair: number;
  /** A few rows, shown both ways, so the fault is visible before anything is written. */
  samples: {
    region: string | null;
    storedUtc: string;
    showsNow: string;
    wouldShow: string;
  }[];
}

const UTC_MIDNIGHT = Prisma.sql`date::time = '00:00:00'`;

export async function diagnoseTimezone(): Promise<TimezoneDiagnosis> {
  const now = new Date();
  const processClock = now.toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const israelClock = formatIsraelTime(now);

  const [counts] = await prisma.$queryRaw<{ broken: bigint; correct: bigint }[]>`
    SELECT count(*) FILTER (WHERE date::time = '00:00:00') AS broken,
           count(*) FILTER (WHERE date::time <> '00:00:00') AS correct
    FROM shifts`;

  const [dutyCounts] = await prisma.$queryRaw<{ broken: bigint }[]>`
    SELECT count(*) FILTER (WHERE date::time = '00:00:00') AS broken FROM duties`;

  const samples = await prisma.$queryRaw<
    { region: string | null; stored: Date; shows_now: string; would_show: string }[]
  >`
    SELECT region,
           "startTime" AS stored,
           to_char("startTime" AT TIME ZONE 'UTC' AT TIME ZONE ${ROSTER_TIME_ZONE},
                   'DD.MM HH24:MI') AS shows_now,
           to_char(("startTime" AT TIME ZONE ${ROSTER_TIME_ZONE}) AT TIME ZONE ${ROSTER_TIME_ZONE},
                   'DD.MM HH24:MI') AS would_show
    FROM shifts
    WHERE ${UTC_MIDNIGHT}
    ORDER BY "startTime" DESC
    LIMIT 5`;

  return {
    processTimeZone: process.env.TZ ?? null,
    processClock,
    israelClock,
    processZoneWrong: processClock !== israelClock,
    shiftsNeedingRepair: Number(counts?.broken ?? 0),
    shiftsAlreadyCorrect: Number(counts?.correct ?? 0),
    dutiesNeedingRepair: Number(dutyCounts?.broken ?? 0),
    samples: samples.map((s) => ({
      region: s.region,
      storedUtc: s.stored.toISOString(),
      showsNow: s.shows_now,
      wouldShow: s.would_show,
    })),
  };
}

export interface TimezoneRepairResult {
  shiftsRepaired: number;
  dutiesRepaired: number;
  uploadRecordsRepaired: number;
  /** Reminder rows cleared so a corrected upcoming shift alerts again. */
  staleRemindersCleared: number;
  after: TimezoneDiagnosis;
}

/**
 * One transaction, four statements, in this order for a reason.
 *
 * The reminders go FIRST because they are selected against the pre-repair rows:
 * a ShiftReminder is the idempotency key that stops a second push going out, so
 * a shift whose time was just corrected would otherwise never alert - its alert
 * was already "sent", hours early, for the wrong time. Only reminders belonging
 * to repaired shifts that are still in the future are cleared, so a shift that
 * was already correct keeps its record and nobody is notified twice.
 */
export async function repairTimezone(): Promise<TimezoneRepairResult> {
  const [staleRemindersCleared, shiftsRepaired, dutiesRepaired, uploadRecordsRepaired] =
    await prisma.$transaction([
      prisma.$executeRaw`
        DELETE FROM shift_reminders r
        USING shifts s
        WHERE r."shiftId" = s.id
          AND s.date::time = '00:00:00'
          AND (s."startTime" AT TIME ZONE ${ROSTER_TIME_ZONE}) > now()`,

      prisma.$executeRaw`
        UPDATE shifts SET
          "startTime" = ("startTime" AT TIME ZONE ${ROSTER_TIME_ZONE}) AT TIME ZONE 'UTC',
          "endTime"   = ("endTime"   AT TIME ZONE ${ROSTER_TIME_ZONE}) AT TIME ZONE 'UTC',
          date        = (date        AT TIME ZONE ${ROSTER_TIME_ZONE}) AT TIME ZONE 'UTC'
        WHERE date::time = '00:00:00'`,

      prisma.$executeRaw`
        UPDATE duties
        SET date = (date AT TIME ZONE ${ROSTER_TIME_ZONE}) AT TIME ZONE 'UTC'
        WHERE date::time = '00:00:00'`,

      prisma.$executeRaw`
        UPDATE shift_files SET "importedDates" = (
          SELECT array_agg(CASE WHEN d::time = '00:00:00'
                                THEN (d AT TIME ZONE ${ROSTER_TIME_ZONE}) AT TIME ZONE 'UTC'
                                ELSE d END ORDER BY d)
          FROM unnest("importedDates") AS d)
        WHERE EXISTS (SELECT 1 FROM unnest("importedDates") AS d WHERE d::time = '00:00:00')`,
    ]);

  return {
    shiftsRepaired,
    dutiesRepaired,
    uploadRecordsRepaired,
    staleRemindersCleared,
    after: await diagnoseTimezone(),
  };
}
