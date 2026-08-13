import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getDefaultTenantId } from '@/lib/db/tenant';
import { workerNumberOtpSchema } from '@/lib/validation/auth';
import { verifyOtp } from '@/lib/auth/otp';
import { respondWithSession } from '@/lib/auth/login-response';
import {
  clearPendingRegistration,
  loadPendingRegistration,
  registrationOtpSubject,
} from '@/lib/auth/pending-registration';
import { callerIp, rateLimit } from '@/lib/auth/rate-limit';
import { resolveHomeStationForCity } from '@/lib/services/station-service';
import { he } from '@/lib/he';

/**
 * Verifies a code and issues the session - for both a returning worker and a
 * first-time registration.
 *
 * The two differ in what the code was issued against: a registered account has
 * an email to key on, whereas a first-time registration is keyed by worker
 * number and carries its details in Redis until this point. Registration only
 * touches the User row here, once the code has checked out.
 */

// verifyOtp already counts wrong guesses per code (5, then the code dies), so
// this only bounds the cheaper attack of cycling fresh codes and guessing at
// each. Kept well above real usage for the same shared-IP reason as /lookup.
const RATE_LIMIT = 40;
const RATE_WINDOW_SECONDS = 15 * 60;

export async function POST(request: NextRequest) {
  const limit = await rateLimit('otp-verify', callerIp(request), RATE_LIMIT, RATE_WINDOW_SECONDS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: he.auth.tooManyAttempts },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = workerNumberOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: he.auth.invalidOtp }, { status: 400 });
  }

  const { workerNumber, otp } = parsed.data;
  const tenantId = await getDefaultTenantId();

  const user = await prisma.user.findUnique({
    where: { tenantId_workerNumber: { tenantId, workerNumber } },
  });
  if (!user) {
    return NextResponse.json({ error: he.error.workerNumberNotFound }, { status: 404 });
  }

  if (!user.email) {
    return completeRegistration(tenantId, workerNumber, user.id, otp);
  }

  const valid = await verifyOtp(user.email, otp);
  if (!valid) {
    return NextResponse.json({ error: he.auth.invalidOtp }, { status: 401 });
  }

  return respondWithSession(user);
}

/** Apply a pending first-time registration once its code verifies. */
async function completeRegistration(
  tenantId: string,
  workerNumber: string,
  userId: string,
  otp: string,
): Promise<NextResponse> {
  const pending = await loadPendingRegistration(tenantId, workerNumber);
  if (!pending) {
    // No submission to apply - either it expired or /api/auth/register was
    // never called. Reported as a bad code rather than "no registration
    // pending", which would tell an unauthenticated caller whether a given
    // worker number currently has one in flight.
    return NextResponse.json({ error: he.auth.invalidOtp }, { status: 401 });
  }

  const valid = await verifyOtp(registrationOtpSubject(tenantId, workerNumber), otp);
  if (!valid) {
    return NextResponse.json({ error: he.auth.invalidOtp }, { status: 401 });
  }

  const { stationId, source } = await resolveHomeStationForCity(pending.city);

  // Guarded on `email: null` so the claim is atomic: if two registrations for
  // the same worker number race to verify, the second finds no row to update
  // rather than overwriting the first winner's account.
  let updated;
  try {
    const result = await prisma.user.updateMany({
      where: { id: userId, email: null },
      data: {
        firstName: pending.firstName,
        lastName: pending.lastName,
        city: pending.city,
        email: pending.email,
        phone: pending.phone,
        homeStationId: stationId,
        homeStationSource: source,
      },
    });
    if (result.count === 0) {
      await clearPendingRegistration(tenantId, workerNumber);
      return NextResponse.json({ error: he.error.workerNumberTaken }, { status: 409 });
    }
    updated = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  } catch (err) {
    // The email was checked for availability at submit time; it can still have
    // been taken in the window since, and the unique index is what decides.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      await clearPendingRegistration(tenantId, workerNumber);
      return NextResponse.json({ error: he.error.emailTaken }, { status: 409 });
    }
    throw err;
  }

  await clearPendingRegistration(tenantId, workerNumber);
  return respondWithSession(updated);
}
