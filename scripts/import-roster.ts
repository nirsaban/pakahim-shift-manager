/**
 * Import a roster file straight into the dev database, bypassing the HTTP layer.
 *
 *   npm run roster:import -- fixtures/rosters/13.08.26.xlsx
 *
 * Useful for exercising the full importer + roster engine against a real file
 * without going through /admin/upload. Reports what landed in the DB.
 */

import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// lib/db/prisma builds its client at module scope, and ESM hoists imports above
// statements — so the env must be loaded before those modules are pulled in,
// which means importing them dynamically rather than at the top of the file.
config({ path: '.env.local' });

async function main(): Promise<void> {
  const { prisma } = await import('../lib/db/prisma');
  const { importShiftFile } = await import('../lib/services/upload-service');

  const file = process.argv[2] ?? path.join('fixtures', 'rosters', '13.08.26.xlsx');

  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error('No tenant found — run `npm run db:seed` first.');

  const uploader = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: { in: ['ADMIN', 'SUPER_ADMIN', 'SHIBUTZ'] } },
  });
  if (!uploader) throw new Error('No ADMIN/SHIBUTZ user found — run `npm run db:seed` first.');

  console.log(`Importing ${file} as ${uploader.email ?? uploader.id}...\n`);

  const result = await importShiftFile({
    tenantId: tenant.id,
    uploadedBy: uploader.id,
    filename: path.basename(file),
    buffer: readFileSync(file),
    confirmClearCoverage: true,
  });

  console.log('Import result:');
  console.log(`  status            ${result.status}`);
  console.log(`  shifts imported   ${result.importedCount}`);
  console.log(`  rows skipped      ${result.skippedCount}`);
  console.log(`  duties parsed     ${result.dutyCount ?? '-'}`);
  console.log(`  handoffs          ${result.handoffCount ?? '-'}`);
  console.log(`  deadhead crossings${String(result.deadheadCrossingCount ?? '-').padStart(3)}`);
  if (result.errorMessage) console.log(`  note              ${result.errorMessage}`);
  if (result.rosterError) console.log(`  ROSTER ERROR      ${result.rosterError}`);

  const [duties, legs, handoffs, linked, unassigned, byStatus, swaps, homes] = await Promise.all([
    prisma.duty.count({ where: { tenantId: tenant.id } }),
    prisma.dutyLeg.count(),
    prisma.handoff.count({ where: { tenantId: tenant.id } }),
    prisma.duty.count({ where: { tenantId: tenant.id, shiftId: { not: null } } }),
    prisma.duty.count({ where: { tenantId: tenant.id, workerNumber: null } }),
    prisma.duty.groupBy({ by: ['parseStatus'], _count: true, where: { tenantId: tenant.id } }),
    prisma.swapSuggestion.groupBy({ by: ['kind'], _count: true, where: { tenantId: tenant.id } }),
    prisma.user.count({ where: { tenantId: tenant.id, homeStationId: { not: null } } }),
  ]);

  console.log('\nIn the database:');
  console.log(`  duties            ${duties}  (${linked} linked to a shift, ${unassigned} unassigned/open)`);
  console.log(`  duty legs         ${legs}`);
  console.log(`  handoffs          ${handoffs}`);
  console.log(`  parse status      ${byStatus.map((s) => `${s.parseStatus}=${s._count}`).join(', ')}`);
  console.log(`  swap suggestions  ${swaps.map((s) => `${s.kind}=${s._count}`).join(', ') || 'none'}`);
  console.log(`  workers w/ home   ${homes}`);

  const sample = await prisma.handoff.findMany({
    where: { tenantId: tenant.id, bothSidesDeadhead: true },
    take: 3,
    include: {
      predecessorDuty: { select: { serial: true, workerName: true, shiftString: true } },
      successorDuty: { select: { serial: true, workerName: true, shiftString: true } },
    },
  });
  console.log('\nSample dead-head crossings (swap candidates):');
  for (const h of sample) {
    console.log(`  train ${h.trainNumber} at ${h.station}, gap ${h.gapMinutes}min`);
    console.log(`    from #${h.predecessorDuty.serial} ${h.predecessorDuty.workerName}: ${h.predecessorDuty.shiftString}`);
    console.log(`    to   #${h.successorDuty.serial} ${h.successorDuty.workerName}: ${h.successorDuty.shiftString}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import('../lib/db/prisma');
    await prisma.$disconnect();
  });
