import webPush from 'web-push';
import { prisma } from '../db/prisma';

/**
 * Web Push (VAPID) delivery.
 *
 * Web Push rather than FCM: no Firebase project to provision, the same approach
 * as the other GeniriFlow products, and it works on iOS 16.4+ — but *only* once
 * the PWA is installed to the home screen, which is why /install exists and why
 * the UI must never promise notifications on an un-installed iOS browser.
 *
 * Every send path here is fire-and-forget by design. A push failure must never
 * roll back the thing it was reporting: an incident is still filed, a roster is
 * still imported, a coverage decision still stands.
 */

let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

  if (!publicKey || !privateKey) {
    console.warn('[push] VAPID keys are not set — push notifications are disabled');
    configured = false;
    return false;
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

export function isPushConfigured(): boolean {
  return ensureConfigured();
}

export interface PushPayload {
  title: string;
  body: string;
  /** Where clicking the notification lands. */
  url?: string;
  /** Collapses repeats of the same subject instead of stacking them. */
  tag?: string;
  /** Keeps the notification on screen until dismissed. Emergencies only. */
  urgent?: boolean;
}

export interface BrowserSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function saveSubscription(
  userId: string,
  subscription: BrowserSubscription,
  userAgent?: string,
): Promise<void> {
  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      userId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
      isActive: true,
      failedAt: null,
    },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
    },
  });
}

export async function removeSubscription(userId: string, endpoint: string): Promise<void> {
  await prisma.pushSubscription.updateMany({
    where: { userId, endpoint },
    data: { isActive: false },
  });
}

/**
 * Send to every active device of the given users.
 *
 * Returns counts rather than throwing: callers are notification side-effects,
 * not transactions. A 404/410 means the endpoint is dead — the browser dropped
 * it or the app was uninstalled — so it is deactivated rather than retried
 * forever.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<{ sent: number; failed: number; skipped: number }> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return { sent: 0, failed: 0, skipped: 0 };
  if (!ensureConfigured()) return { sent: 0, failed: 0, skipped: unique.length };

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: unique }, isActive: true },
  });
  if (subscriptions.length === 0) return { sent: 0, failed: 0, skipped: unique.length };

  const body = JSON.stringify(payload);
  const dead: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        );
        sent += 1;
      } catch (error) {
        failed += 1;
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) dead.push(sub.endpoint);
        else console.error('[push] send failed', status, (error as Error).message);
      }
    }),
  );

  if (dead.length > 0) {
    await prisma.pushSubscription.updateMany({
      where: { endpoint: { in: dead } },
      data: { isActive: false, failedAt: new Date() },
    });
  }

  return { sent, failed, skipped: 0 };
}

/** Fire-and-forget wrapper — never let a push failure break the caller. */
export function notify(userIds: string[], payload: PushPayload): void {
  sendPushToUsers(userIds, payload).catch((error) => {
    console.error('[push] notify failed', error);
  });
}
