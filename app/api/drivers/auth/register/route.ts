import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getDriversTenantId } from '@/lib/db/tenant';
import { driverRegisterSchema } from '@/lib/validation/driver-auth';
import {
  driverRegistrationOtpSubject,
  findDriverByWorkerNumber,
  savePendingDriverEmail,
} from '@/lib/auth/driver-auth';
import { isSamePhone } from '@/lib/auth/driver-phone';
import { requestOtp } from '@/lib/auth/otp';
import { deliverOtp } from '@/lib/auth/otp-delivery';
import { callerIp, rateLimit } from '@/lib/auth/rate-limit';
import { rateLimitedResponse } from '@/lib/auth/rate-limited-response';
import { he } from '@/lib/he';

/**
 * First login, step two: the driver gives an email and their phone, and a code
 * goes to both. Nothing is written to the account until /verify sees the code.
 *
 * The phone has to be the one on the contact list. A worker number alone is no
 * proof - it is printed on the roster every driver receives - so this is where
 * an account is actually claimed. A driver whose number changed is sent to the
 * roster admin, who can correct it.
 */
const RATE_LIMIT = 15;
const RATE_WINDOW_SECONDS = 15 * 60;

export async function POST(request: NextRequest) {
  const limit = await rateLimit('drv-register', callerIp(request), RATE_LIMIT, RATE_WINDOW_SECONDS);
  if (!limit.ok) return rateLimitedResponse(limit);

  const parsed = driverRegisterSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: he.error.required }, { status: 400 });
  const { workerNumber, email, phone } = parsed.data;

  const tenantId = await getDriversTenantId();
  const driver = await findDriverByWorkerNumber(tenantId, workerNumber);
  if (!driver) return NextResponse.json({ error: he.drivers.workerNumberNotFound }, { status: 404 });
  if (driver.email) {
    return NextResponse.json({ error: he.drivers.alreadyRegistered, reason: 'already_registered' }, { status: 409 });
  }
  if (!isSamePhone(phone, driver.phone)) {
    return NextResponse.json({ error: he.drivers.phoneMismatch }, { status: 400 });
  }

  const emailOwner = await prisma.user.findUnique({ where: { tenantId_email: { tenantId, email } } });
  if (emailOwner) return NextResponse.json({ error: he.error.emailTaken }, { status: 409 });

  const otp = await requestOtp(driverRegistrationOtpSubject(tenantId, workerNumber));
  if (!otp.ok) return NextResponse.json({ error: he.auth.otpCooldown, reason: 'cooldown' }, { status: 429 });

  // Saved only once a code is issued, so a cooldown cannot swap the email a
  // still-valid code belongs to.
  await savePendingDriverEmail(tenantId, workerNumber, email);

  // To the phone on file, which is the one just checked.
  const channels = await deliverOtp({ code: otp.code, email, phone: driver.phone, allChannels: true });
  return NextResponse.json({ status: 'otp_sent', channels });
}
