/**
 * One-time timezone repair, run from the container entrypoint on every boot.
 *
 * Why at boot rather than by hand: shifts written before the importer became
 * zone-aware read three hours late, and that is what a worker sees on their
 * phone when they check what time to start. Leaving it to whoever next gets a
 * shell on the box means the roster stays wrong in the meantime.
 *
 * Safe to run on every boot, and it is:
 *  - it only matches `Shift.date` at exactly 00:00:00 UTC, which is what the OLD
 *    code wrote; the fixed importer writes Israeli midnight (21:00/22:00 the day
 *    before), so a repaired row can never match again. After the first run this
 *    is a no-op that touches nothing.
 *  - it never throws the boot. A repair that fails must not take the app down -
 *    wrong hours are bad, no app at all is worse. The admin page at
 *    /admin/timezone shows the same diagnosis and can re-run it.
 */

async function main(): Promise<void> {
  const { diagnoseTimezone, repairTimezone } = await import('../lib/services/timezone-repair-service');

  const before = await diagnoseTimezone();

  if (before.processZoneWrong) {
    // The data path no longer depends on TZ, but this still means logs and any
    // un-migrated toLocaleString would be off - worth shouting about.
    console.warn(
      `[timezone] process is not rendering Israel time (TZ=${before.processTimeZone ?? 'unset'}, ` +
        `process says ${before.processClock}, Israel is ${before.israelClock})`,
    );
  }

  if (before.shiftsNeedingRepair === 0 && before.dutiesNeedingRepair === 0) {
    console.log('[timezone] no pre-fix rows; nothing to repair');
    return;
  }

  console.log(
    `[timezone] repairing ${before.shiftsNeedingRepair} shifts and ` +
      `${before.dutiesNeedingRepair} duties written before the zone fix`,
  );
  for (const sample of before.samples) {
    console.log(`[timezone]   e.g. shows ${sample.showsNow} -> will show ${sample.wouldShow}`);
  }

  const result = await repairTimezone();
  console.log(
    `[timezone] repaired: ${result.shiftsRepaired} shifts, ${result.dutiesRepaired} duties, ` +
      `${result.uploadRecordsRepaired} upload records, ${result.staleRemindersCleared} stale reminders cleared`,
  );
  console.log(`[timezone] rows still needing repair: ${result.after.shiftsNeedingRepair}`);
}

main()
  .catch((error) => {
    // Deliberately not a non-zero exit: see the header.
    console.error('[timezone] repair failed, continuing boot anyway:', error);
  })
  .then(async () => {
    const { prisma } = await import('../lib/db/prisma');
    await prisma.$disconnect();
  });
