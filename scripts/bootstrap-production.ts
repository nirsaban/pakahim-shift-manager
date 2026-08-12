/**
 * DESTRUCTIVE. Empties every application table, then creates a clean starting
 * state: one tenant, one admin, one worker, one team, plus the station and
 * train-line reference data.
 *
 *   docker exec pakahim-app npx tsx scripts/bootstrap-production.ts --yes
 *
 * Refuses to run without --yes. There is no backup step: take one first if you
 * want a way back.
 *
 *   docker exec pakahim-db pg_dump -U pakahim pakahim > backup-$(date +%Y%m%d-%H%M).sql
 *
 * Accounts are configurable so this is not a one-off:
 *   BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_WORKER_NUMBER
 *   BOOTSTRAP_WORKER_EMAIL, BOOTSTRAP_WORKER_NAME, BOOTSTRAP_WORKER_NUMBER
 */

import { config } from 'dotenv';

config({ path: '.env.local' });

const ADMIN_EMAIL = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'yakirsaban47@gmail.com';
const ADMIN_NAME = process.env.BOOTSTRAP_ADMIN_NAME ?? 'יקיר סבן';
const ADMIN_WORKER_NUMBER = process.env.BOOTSTRAP_ADMIN_WORKER_NUMBER ?? '900001';

// A Gmail plus-alias: distinct enough to satisfy @@unique([tenantId, email]),
// but delivered to the same inbox as the admin address — so one person holds
// both accounts and both login codes arrive in the same mailbox, with no OTP
// redirect needed.
const WORKER_EMAIL = process.env.BOOTSTRAP_WORKER_EMAIL ?? 'yakirsaban47+worker@gmail.com';
const WORKER_NAME = process.env.BOOTSTRAP_WORKER_NAME ?? 'יקיר סבן (פקח)';
// Login accepts any non-empty string, not just digits — a short ID is easier
// to type on a phone than a six-digit payroll number.
const WORKER_NUMBER = process.env.BOOTSTRAP_WORKER_NUMBER ?? 'AD-1';

const TEAM_NAME = process.env.BOOTSTRAP_TEAM_NAME ?? 'פקחים';

async function main(): Promise<void> {
  if (!process.argv.includes('--yes')) {
    console.error('This wipes every application table. Re-run with --yes to confirm.');
    process.exit(1);
  }

  const { prisma } = await import('../lib/db/prisma');

  console.log('Wiping application tables...');
  // Ordered so foreign keys never block a delete. Reference tables
  // (stations / train lines) go too — they are re-seeded below.
  await prisma.$transaction([
    prisma.swapSuggestion.deleteMany(),
    prisma.handoff.deleteMany(),
    prisma.dutyLeg.deleteMany(),
    prisma.duty.deleteMany(),
    prisma.coverageRequest.deleteMany(),
    prisma.incidentRecipient.deleteMany(),
    prisma.incident.deleteMany(),
    prisma.shift.deleteMany(),
    prisma.shiftFile.deleteMany(),
    prisma.pushSubscription.deleteMany(),
    prisma.discoveryAnswer.deleteMany(),
    prisma.trainLineStop.deleteMany(),
    prisma.trainLine.deleteMany(),
    prisma.stationAlias.deleteMany(),
    prisma.station.deleteMany(),
  ]);

  // Teams reference a lead and users reference a team, so both sides have to be
  // detached before either can be removed.
  await prisma.user.updateMany({ data: { teamId: null, homeStationId: null } });
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
  console.log('  done');

  const tenant = await prisma.tenant.create({
    data: { name: 'רכבת ישראל', slug: 'default' },
  });

  const admin = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: ADMIN_EMAIL,
      firstName: ADMIN_NAME,
      workerNumber: ADMIN_WORKER_NUMBER,
      role: 'ADMIN',
    },
  });

  // The roster importer needs a team to attach shifts to. It looks for a
  // TEAM_LEAD first and falls back to the tenant's first team, so making the
  // admin the nominal lead is enough for uploads to work with only two accounts.
  const team = await prisma.team.create({
    data: { tenantId: tenant.id, name: TEAM_NAME, teamLeadId: admin.id },
  });

  const worker = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: WORKER_EMAIL,
      firstName: WORKER_NAME,
      workerNumber: WORKER_NUMBER,
      role: 'PAKAHIM',
      teamId: team.id,
    },
  });

  console.log('\nCreated:');
  console.log(`  tenant  ${tenant.name} (${tenant.slug})`);
  console.log(`  admin   ${admin.email}  worker number ${admin.workerNumber}`);
  console.log(`  worker  ${worker.email}  worker number ${worker.workerNumber}`);
  console.log(`  team    ${team.name}`);

  console.log('\nSeeding station and train-line reference data...');
  await prisma.$disconnect();
  await import('../prisma/seed-reference');

  console.log('\nLogin is by worker number. Both codes land in the same inbox:');
  console.log(`  admin  ${ADMIN_WORKER_NUMBER} -> ${ADMIN_EMAIL}`);
  console.log(`  worker ${WORKER_NUMBER} -> ${WORKER_EMAIL}`);
  console.log('\nTo deliver every code to more than one mailbox, set (unquoted):');
  console.log(
    `  OTP_REDIRECT_MAP=${ADMIN_EMAIL}=<a>;<b>,${WORKER_EMAIL}=<a>;<b>`,
  );
}

main().catch(async (e) => {
  console.error(e);
  const { prisma } = await import('../lib/db/prisma');
  await prisma.$disconnect();
  process.exit(1);
});
