/**
 * Imports the locomotive drivers' contact list (אלפון נהגים PDF) into the
 * drivers tenant, creating the tenant on first run.
 *
 *   npx tsx scripts/import-driver-contacts.ts <contacts.pdf> --roster-admin <worker number>
 *   npx tsx scripts/import-driver-contacts.ts <contacts.pdf> --roster-admin <worker number> --apply
 *
 * Without --apply it only prints what would change. Safe to re-run: drivers are
 * matched by worker number (or phone, for one the list lacked a number for),
 * and nobody is deleted. A driver who has already logged in keeps their phone.
 */

import { readFile } from 'fs/promises';
import { config } from 'dotenv';

// lib/db/prisma reads DATABASE_URL when it is imported, so the env must be
// loaded before it is - hence the dynamic imports below.
config({ path: '.env.local' });

function argAfter(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const file = process.argv[2];
  const rosterAdmin = argAfter('--roster-admin');
  const apply = process.argv.includes('--apply');
  if (!file || file.startsWith('--') || !rosterAdmin) {
    console.error('Usage: import-driver-contacts.ts <contacts.pdf> --roster-admin <worker number> [--apply]');
    process.exit(1);
  }

  const { readPdfTextItems } = await import('../lib/driver-roster/pdf');
  const { parseDriverContacts } = await import('../lib/driver-roster/contacts');
  const { importDriverContacts } = await import('../lib/services/driver-contacts-service');
  const { prisma } = await import('../lib/db/prisma');

  const { contacts, warnings } = parseDriverContacts(await readPdfTextItems(new Uint8Array(await readFile(file))));
  console.log(`Read ${contacts.length} drivers from ${file}.`);
  if (warnings.length > 0) {
    console.log(`\n${warnings.length} need attention:`);
    for (const w of warnings) console.log(`  - ${w}`);
  }

  const { plan, rosterAdminName } = await importDriverContacts({ contacts, rosterAdminWorkerNumber: rosterAdmin, apply });

  console.log(`\nRoster admin: ${rosterAdminName} (${rosterAdmin})`);
  console.log(`New drivers:       ${plan.create.length}`);
  console.log(`Updated drivers:   ${plan.update.length}`);
  for (const u of plan.update) console.log(`  - ${u.name}: ${Object.keys(u.changes).join(', ')}`);
  console.log(`Unchanged drivers: ${plan.unchanged}`);
  if (plan.notInList.length > 0) {
    console.log(`Not in this list (kept): ${plan.notInList.length}`);
    for (const d of plan.notInList) console.log(`  - ${d.firstName ?? d.id} (${d.workerNumber ?? 'no number'})`);
  }
  console.log(apply ? '\nApplied.' : '\nDry run - nothing written. Re-run with --apply to import.');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
