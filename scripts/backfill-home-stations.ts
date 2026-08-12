/**
 * Derive home stations for workers who already entered a city.
 *
 *   npm run roster:backfill-homes
 *
 * Cities that cannot be mapped are queued as unresolved CITY aliases for admin
 * review rather than guessed.
 */

import { config } from 'dotenv';

config({ path: '.env.local' });

async function main(): Promise<void> {
  const { prisma } = await import('../lib/db/prisma');
  const { backfillHomeStations, listUnresolvedAliases } = await import('../lib/services/station-service');

  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error('No tenant found — run `npm run db:seed` first.');

  const { resolved, unresolved } = await backfillHomeStations(tenant.id);
  console.log(`Resolved ${resolved} home station(s); ${unresolved} city value(s) could not be mapped.`);

  const queue = await listUnresolvedAliases(25);
  if (queue.length > 0) {
    console.log('\nUnresolved aliases awaiting review:');
    for (const a of queue) console.log(`  [${a.kind}] "${a.raw}"  seen ${a.seenCount}x`);
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
