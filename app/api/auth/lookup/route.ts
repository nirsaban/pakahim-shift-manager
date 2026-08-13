import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getDefaultTenantId } from '@/lib/db/tenant';
import { workerNumberSchema } from '@/lib/validation/auth';
import { requestOtp } from '@/lib/auth/otp';
import { deliverOtp } from '@/lib/auth/otp-delivery';
import { callerIp, rateLimit } from '@/lib/auth/rate-limit';
import { he } from '@/lib/he';

/**
 * Resolves a worker number to the next login step, sending a code when the
 * account is already registered.
 *
 * This unavoidably distinguishes three states - unknown number, registered, and
 * registered-but-unclaimed - which is what the login page needs and also what
 * makes it a roster enumeration oracle. Rate limiting is the mitigation: a
 * worker logging in needs a couple of calls, sweeping the roster needs hundreds.
 */
// Deliberately generous. Israeli mobile carriers CGNAT their subscribers and a
// depot's wifi is one address, so a shared IP legitimately produces bursts of
// logins - too tight a limit locks out a whole shift rather than an attacker.
// It still bounds bulk enumeration: sweeping the ~250-worker roster from one
// address takes hours instead of seconds, which is the point.
const RATE_LIMIT = 30;
const RATE_WINDOW_SECONDS = 15 * 60;

export async function POST(request: NextRequest) {
  const limit = await rateLimit('lookup', callerIp(request), RATE_LIMIT, RATE_WINDOW_SECONDS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: he.auth.tooManyAttempts },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = workerNumberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: he.error.required }, { status: 400 });
  }

  const { workerNumber } = parsed.data;
  const tenantId = await getDefaultTenantId();

  const user = await prisma.user.findUnique({
    where: { tenantId_workerNumber: { tenantId, workerNumber } },
  });

  if (!user) {
    return NextResponse.json({ error: he.error.workerNumberNotFound }, { status: 404 });
  }

  if (!user.email) {
    return NextResponse.json({
      status: 'needs_registration',
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
    });
  }

  const result = await requestOtp(user.email);
  if (!result.ok) {
    return NextResponse.json({ error: he.auth.otpCooldown }, { status: 429 });
  }

  // Best-effort: the code is already stored (and the dev fallback code always
  // verifies outside production) - a flaky channel shouldn't 500 the whole
  // login attempt. WhatsApp is preferred, email is the fallback.
  const channels = await deliverOtp({ code: result.code, email: user.email, phone: user.phone });

  return NextResponse.json({ status: 'otp_sent', channels });
}
