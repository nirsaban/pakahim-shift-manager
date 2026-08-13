import { redis } from '../redis';

/**
 * A first-time registration that has been submitted but not yet proven.
 *
 * Registration used to write the worker's details straight to the User row and
 * hand back a session, which meant anyone who knew a worker number could claim
 * that account outright. The details now wait here until an OTP sent to the
 * submitted address comes back verified; only then are they applied.
 *
 * Holding them in Redis rather than on the User row matters: an unverified
 * attempt must not set `user.email`, because that is exactly what marks an
 * account as "already registered" and would lock the real worker out of the
 * registration path even though the attempt was never completed.
 */

// Slightly longer than the OTP's own 5-minute life so a code that is still
// valid always has a registration to apply - the OTP is the thing that expires.
const PENDING_TTL_SECONDS = 10 * 60;

export interface PendingRegistration {
  firstName: string;
  lastName: string;
  city: string;
  email: string;
  phone: string;
}

function pendingKey(tenantId: string, workerNumber: string): string {
  return `reg:pending:${tenantId}:${workerNumber}`;
}

export async function savePendingRegistration(
  tenantId: string,
  workerNumber: string,
  data: PendingRegistration,
): Promise<void> {
  await redis.set(
    pendingKey(tenantId, workerNumber),
    JSON.stringify(data),
    'EX',
    PENDING_TTL_SECONDS,
  );
}

export async function loadPendingRegistration(
  tenantId: string,
  workerNumber: string,
): Promise<PendingRegistration | null> {
  const raw = await redis.get(pendingKey(tenantId, workerNumber));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingRegistration;
  } catch {
    return null;
  }
}

export async function clearPendingRegistration(
  tenantId: string,
  workerNumber: string,
): Promise<void> {
  await redis.del(pendingKey(tenantId, workerNumber));
}

/**
 * The OTP subject for a pending registration.
 *
 * Login OTPs are keyed by the account's own email, but a registering worker has
 * no email on their account yet - and must not be able to influence the key by
 * choosing one, or two people registering with the same address would share a
 * code. The worker number is the stable, server-known identifier here.
 */
export function registrationOtpSubject(tenantId: string, workerNumber: string): string {
  return `reg:${tenantId}:${workerNumber}`;
}
