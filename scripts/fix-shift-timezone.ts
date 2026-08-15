/**
 * Manual timezone repair, for when you have a shell on the box.
 *
 *   npm run fix:timezone           # dry run - reports, writes nothing
 *   npm run fix:timezone -- --apply
 *
 * The logic itself lives in lib/services/timezone-repair-service.ts, which is
 * also what the container entrypoint runs on every boot and what the admin page
 * at /admin/timezone calls. Three entry points, one implementation - the repair
 * rewrites roster times, and three copies of that drifting apart is precisely
 * the sort of thing that caused the bug it repairs.
 */

import { config } from 'dotenv';

// lib/db/prisma builds its client at module scope and ESM hoists imports above
// statements, so the env has to load before that module is pulled in. In the
// container there is no .env.local and the vars are already set - dotenv finding
// no file is a no-op, which is what makes this work in both places.
config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');

async function main(): Promise<void> {
  const { diagnoseTimezone, repairTimezone } = await import('../lib/services/timezone-repair-service');
  const { prisma } = await import('../lib/db/prisma');

  const before = await diagnoseTimezone();

  console.log(APPLY ? '=== APPLYING timezone repair ===' : '=== DRY RUN (pass --apply to write) ===');
  console.log(`process clock  ${before.processClock}   (TZ=${before.processTimeZone ?? 'unset'})`);
  console.log(`israel clock   ${before.israelClock}${before.processZoneWrong ? '   <-- process is NOT on Israel time' : ''}`);
  console.log(`shifts         ${before.shiftsNeedingRepair} need repair, ${before.shiftsAlreadyCorrect} already correct`);
  console.log(`duties         ${before.dutiesNeedingRepair} need repair`);

  for (const sample of before.samples) {
    console.log(`  e.g. ${sample.region ?? '—'}: shows ${sample.showsNow} -> will show ${sample.wouldShow}`);
  }

  if (!APPLY) {
    console.log('\nnothing written. re-run with --apply to commit these changes.');
    await prisma.$disconnect();
    return;
  }

  const result = await repairTimezone();
  console.log(`\nshifts repaired          ${result.shiftsRepaired}`);
  console.log(`duties repaired          ${result.dutiesRepaired}`);
  console.log(`upload records repaired  ${result.uploadRecordsRepaired}`);
  console.log(`stale reminders cleared  ${result.staleRemindersCleared}`);
  console.log(`still needing repair     ${result.after.shiftsNeedingRepair}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
