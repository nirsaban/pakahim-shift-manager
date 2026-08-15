/**
 * One-time repair for shifts imported before roster times were zone-aware.
 *
 *   npm run fix:timezone           # dry run - prints what it would change
 *   npm run fix:timezone -- --apply
 *
 * The old importer built instants with `new Date(year, month, day)` plus
 * `setMinutes(...)`, which reads the server's zone. Production had no TZ set, so
 * it ran UTC and a 04:00 roster line was stored as 04:00Z - three hours late in
 * summer. Server-rendered times formatted back in UTC and looked correct, so the
 * only visible symptom was the pre-shift reminder firing after the shift had
 * already started.
 *
 * WHAT COUNTS AS A BROKEN ROW: `Shift.date` at exactly 00:00:00.000Z. A roster
 * date written by the fixed code is Israeli midnight - 21:00Z or 22:00Z the day
 * before - so this discriminator cannot mistake a repaired row for a broken one,
 * which is what makes the script safe to run twice.
 *
 * WHAT IT DOES: keeps the wall-clock reading and re-anchors it to Israel. A row
 * stored as 04:00Z becomes the instant at which Israel reads 04:00. Nothing is
 * inferred from the source file, so this works for dates whose file is long gone
 * - which is the whole reason to have it rather than just re-uploading.
 */

import { config } from 'dotenv';
import { israelMidnight, israelTime, ROSTER_TIME_ZONE } from '../lib/time/zone';

// Same dance as scripts/import-roster.ts: lib/db/prisma builds its client (with
// the Prisma 7 driver adapter) at module scope, and ESM hoists imports above
// statements, so the env has to be loaded before that module is pulled in.
config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');

/** The wall clock the old code meant to store, read back out of the UTC stamp. */
function reanchor(stored: Date): Date {
  return israelTime(
    stored.getUTCFullYear(),
    stored.getUTCMonth() + 1,
    stored.getUTCDate(),
    stored.getUTCHours() * 60 + stored.getUTCMinutes(),
  );
}

function isUtcMidnight(date: Date): boolean {
  return (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
}

function utcMidnightToIsrael(date: Date): Date {
  return israelMidnight(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function hhmm(date: Date, timeZone?: string): string {
  return date.toLocaleString('he-IL', {
    timeZone: timeZone ?? 'UTC',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function main(): Promise<void> {
  const { prisma } = await import('../lib/db/prisma');

  console.log(APPLY ? '=== APPLYING timezone repair ===' : '=== DRY RUN (pass --apply to write) ===');

  // Shifts. The date filter is a plain equality on the UTC-midnight discriminator
  // rather than a scan: broken and repaired rows are never both present for one
  // date, so anything still at UTC midnight predates the fix.
  const shifts = await prisma.shift.findMany({
    select: { id: true, date: true, startTime: true, endTime: true },
    orderBy: { date: 'asc' },
  });
  const brokenShifts = shifts.filter((s) => isUtcMidnight(s.date));

  console.log(`shifts: ${shifts.length} total, ${brokenShifts.length} written before the fix`);

  for (const sample of brokenShifts.slice(0, 5)) {
    const start = reanchor(sample.startTime);
    console.log(
      `  e.g. ${hhmm(sample.startTime)}Z read as ${hhmm(sample.startTime, ROSTER_TIME_ZONE)} Israel` +
        ` -> ${hhmm(start, ROSTER_TIME_ZONE)} Israel (${start.toISOString()})`,
    );
  }

  // Duties carry the same roster date and are matched on it by every roster query.
  const duties = await prisma.duty.findMany({ select: { id: true, date: true } });
  const brokenDuties = duties.filter((d) => isUtcMidnight(d.date));
  console.log(`duties: ${duties.length} total, ${brokenDuties.length} written before the fix`);

  // Upload history records which dates a file wrote; left behind it would name
  // days that no longer exist.
  const files = await prisma.shiftFile.findMany({ select: { id: true, importedDates: true } });
  const brokenFiles = files.filter((f) => f.importedDates.some(isUtcMidnight));
  console.log(`upload records: ${files.length} total, ${brokenFiles.length} naming pre-fix dates`);

  if (!APPLY) {
    console.log('\nnothing written. re-run with --apply to commit these changes.');
    return;
  }

  let updated = 0;
  // Batched rather than one transaction: a partial run is safe here because the
  // discriminator makes every update idempotent, and a single transaction over
  // thousands of rows is the kind of thing that times out at exactly the wrong
  // moment.
  for (const shift of brokenShifts) {
    await prisma.shift.update({
      where: { id: shift.id },
      data: {
        date: utcMidnightToIsrael(shift.date),
        startTime: reanchor(shift.startTime),
        endTime: reanchor(shift.endTime),
      },
    });
    updated += 1;
    if (updated % 200 === 0) console.log(`  ...${updated}/${brokenShifts.length} shifts`);
  }
  console.log(`shifts repaired: ${updated}`);

  for (const duty of brokenDuties) {
    await prisma.duty.update({
      where: { id: duty.id },
      data: { date: utcMidnightToIsrael(duty.date) },
    });
  }
  console.log(`duties repaired: ${brokenDuties.length}`);

  for (const file of brokenFiles) {
    await prisma.shiftFile.update({
      where: { id: file.id },
      data: {
        importedDates: file.importedDates.map((d) => (isUtcMidnight(d) ? utcMidnightToIsrael(d) : d)),
      },
    });
  }
  console.log(`upload records repaired: ${brokenFiles.length}`);

  console.log('\ndone. re-run the dry run to confirm nothing is left.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
