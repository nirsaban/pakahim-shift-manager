/**
 * Send a test push to a subscribed user, to check the whole chain end to end.
 *
 *   npm run push:test                      # first active subscription
 *   npm run push:test -- worker@demo.local # by email or worker number
 *
 * Confirms VAPID config, that a subscription exists, and that the push service
 * accepted the message. Whether it then appears on screen is up to the OS.
 */

import { config } from 'dotenv';

config({ path: '.env.local' });

async function main(): Promise<void> {
  const { prisma } = await import('../lib/db/prisma');
  const { sendPushToUsers, isPushConfigured } = await import('../lib/services/push-service');
  const { he } = await import('../lib/he');

  if (!isPushConfigured()) {
    console.error('VAPID keys are not set — see .env.example');
    process.exit(1);
  }

  const who = process.argv[2];
  const user = who
    ? await prisma.user.findFirst({ where: { OR: [{ email: who }, { workerNumber: who }] } })
    : (await prisma.pushSubscription.findFirst({ where: { isActive: true }, include: { user: true } }))?.user;

  if (!user) {
    console.error(who ? `No user matching "${who}"` : 'No active push subscriptions yet.');
    console.error('Sign in, open /install and enable notifications first.');
    process.exit(1);
  }

  const subscriptions = await prisma.pushSubscription.count({
    where: { userId: user.id, isActive: true },
  });
  console.log(`${user.email ?? user.workerNumber} — ${subscriptions} active device(s)`);

  const result = await sendPushToUsers([user.id], {
    title: he.push.shiftAssigned.title,
    body: he.push.shiftAssigned.body('בדיקה'),
    url: '/dashboard',
    tag: 'test',
  });

  console.log(`sent=${result.sent} failed=${result.failed} skipped=${result.skipped}`);
  if (result.sent === 0) console.error('Nothing was delivered — is a device subscribed?');
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
