import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getDefaultTenantId } from '@/lib/db/tenant';
import { workerNumberSchema } from '@/lib/validation/auth';
import { requestOtp } from '@/lib/auth/otp';
import { sendOtpEmail } from '@/lib/mail/mailer';
import { he } from '@/lib/he';

export async function POST(request: NextRequest) {
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

  // Best-effort: the code is already stored (and the dev fallback code always verifies
  // outside production) - a flaky mail provider shouldn't 500 the whole login attempt.
  await sendOtpEmail(user.email, result.code).catch((err) => {
    console.error('Failed to send OTP email:', err);
  });

  return NextResponse.json({ status: 'otp_sent' });
}
