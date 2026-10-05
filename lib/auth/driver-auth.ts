import { prisma } from '../db/prisma';
import { redis } from '../redis';
import { isSamePhone } from './driver-phone';

/**
 * Login for locomotive drivers. See docs/modules/drivers.md.
 *
 * Drivers are already on file from their contact list, so there is no
 * registration form:
 * - **First login:** worker number, then email + phone. The phone must be the
 *   one on file - worker numbers are printed on a roster everybody receives,
 *   so the phone is what proves it is really them.
 * - **Later logins:** phone only.
 *
 * Everything here is scoped to the drivers tenant the caller passes in.
 */

export async function findDriverByWorkerNumber(tenantId: string, workerNumber: string) {
  const user = await prisma.user.findUnique({
    where: { tenantId_workerNumber: { tenantId, workerNumber } },
  });
  return user?.role === 'DRIVER' ? user : null;
}

/**
 * Every driver whose phone is this number. Matched after normalising, since the
 * list prints "050-2582463" and drivers type whatever they like. A few hundred
 * rows, so comparing in memory is cheaper than storing a second phone column.
 * More than one result is possible in principle and the caller must refuse it.
 */
export async function findDriversByPhone(tenantId: string, phone: string) {
  const drivers = await prisma.user.findMany({
    where: { tenantId, role: 'DRIVER', phone: { not: null } },
  });
  return drivers.filter((d) => isSamePhone(d.phone, phone));
}

/** A returning driver's code is keyed by their account, not by what they typed. */
export function driverLoginOtpSubject(userId: string): string {
  return `drv:${userId}`;
}

/** A first login's code, keyed by worker number as the פקחים registration is. */
export function driverRegistrationOtpSubject(tenantId: string, workerNumber: string): string {
  return `drv-reg:${tenantId}:${workerNumber}`;
}

// Outlives the 5-minute code, so a code that still verifies always has an email to apply.
const PENDING_TTL_SECONDS = 10 * 60;

function pendingEmailKey(tenantId: string, workerNumber: string): string {
  return `drv-reg:pending:${tenantId}:${workerNumber}`;
}

/**
 * The email a first login submitted, held until its code verifies. Writing it
 * to the user straight away would mark the account as registered - and lock the
 * real driver out of first login - on the strength of an unproven attempt.
 */
export async function savePendingDriverEmail(tenantId: string, workerNumber: string, email: string): Promise<void> {
  await redis.set(pendingEmailKey(tenantId, workerNumber), email, 'EX', PENDING_TTL_SECONDS);
}

export async function loadPendingDriverEmail(tenantId: string, workerNumber: string): Promise<string | null> {
  return redis.get(pendingEmailKey(tenantId, workerNumber));
}

export async function clearPendingDriverEmail(tenantId: string, workerNumber: string): Promise<void> {
  await redis.del(pendingEmailKey(tenantId, workerNumber));
}
