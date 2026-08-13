import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getDefaultTenantId } from '@/lib/db/tenant';
import { registerSchema } from '@/lib/validation/auth';
import { requestOtp } from '@/lib/auth/otp';
import { deliverOtp } from '@/lib/auth/otp-delivery';
import {
  registrationOtpSubject,
  savePendingRegistration,
} from '@/lib/auth/pending-registration';
import { callerIp, rateLimit } from '@/lib/auth/rate-limit';
import { he } from '@/lib/he';

/**
 * Step one of a first-time registration: validate the details, then send a code.
 *
 * This route used to write the worker's details straight to the User row and
 * return a live session, which meant knowing a worker number was enough to
 * claim that account. Nothing is persisted to the user now - the submission
 * waits in Redis until /api/auth/otp/verify proves the submitter can read the
 * code at the address they gave.
 */

// Registration is once per worker, but onboarding happens in groups on a shared
// depot wifi or behind carrier CGNAT, so the limit has to tolerate a roomful of
// workers signing up at once while still refusing a scripted sweep.
const RATE_LIMIT = 15;
const RATE_WINDOW_SECONDS = 15 * 60;

export async function POST(request: NextRequest) {
  const limit = await rateLimit('register', callerIp(request), RATE_LIMIT, RATE_WINDOW_SECONDS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: he.auth.tooManyAttempts, reason: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: he.error.required }, { status: 400 });
  }

  const { workerNumber, firstName, lastName, city, email, phone } = parsed.data;
  const tenantId = await getDefaultTenantId();

  const user = await prisma.user.findUnique({
    where: { tenantId_workerNumber: { tenantId, workerNumber } },
  });
  if (!user) {
    return NextResponse.json({ error: he.error.workerNumberNotFound }, { status: 404 });
  }
  if (user.email) {
    // Already registered - the login page should have routed them to the OTP step instead.
    return NextResponse.json({ error: he.error.workerNumberTaken }, { status: 409 });
  }

  const emailOwner = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId, email } },
  });
  if (emailOwner) {
    return NextResponse.json({ error: he.error.emailTaken }, { status: 409 });
  }

  const subject = registrationOtpSubject(tenantId, workerNumber);
  const otp = await requestOtp(subject);
  if (!otp.ok) {
    return NextResponse.json({ error: he.auth.otpCooldown, reason: 'cooldown' }, { status: 429 });
  }

  // Stored only after the OTP is issued, so a cooldown rejection cannot quietly
  // replace the details a previous, still-verifiable code belongs to.
  await savePendingRegistration(tenantId, workerNumber, {
    firstName,
    lastName,
    city,
    email,
    phone,
  });

  const channels = await deliverOtp({ code: otp.code, email, phone });

  return NextResponse.json({ status: 'otp_sent', channels });
}
