import { NextRequest, NextResponse } from 'next/server';
import { getDriversTenantId } from '@/lib/db/tenant';
import { driverPhoneSchema } from '@/lib/validation/driver-auth';
import { driverLoginOtpSubject, findDriversByPhone } from '@/lib/auth/driver-auth';
import { requestOtp } from '@/lib/auth/otp';
import { deliverOtp } from '@/lib/auth/otp-delivery';
import { callerIp, rateLimit } from '@/lib/auth/rate-limit';
import { rateLimitedResponse } from '@/lib/auth/rate-limited-response';
import { he } from '@/lib/he';

/**
 * A returning driver's login: phone only. The code goes to that phone on
 * WhatsApp and to the email they confirmed on first login.
 */
const RATE_LIMIT = 30;
const RATE_WINDOW_SECONDS = 15 * 60;

export async function POST(request: NextRequest) {
  const limit = await rateLimit('drv-phone', callerIp(request), RATE_LIMIT, RATE_WINDOW_SECONDS);
  if (!limit.ok) return rateLimitedResponse(limit);

  const parsed = driverPhoneSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: he.error.invalidPhone }, { status: 400 });

  const tenantId = await getDriversTenantId();
  const drivers = await findDriversByPhone(tenantId, parsed.data.phone);
  if (drivers.length === 0) return NextResponse.json({ error: he.drivers.phoneNotFound }, { status: 404 });
  // Two drivers on one phone: a code would log in one of them, and nobody can
  // say which was meant. Refuse rather than guess.
  if (drivers.length > 1) return NextResponse.json({ error: he.drivers.phoneShared }, { status: 409 });

  const [driver] = drivers;
  if (!driver.email) {
    return NextResponse.json({ error: he.drivers.firstLoginRequired, reason: 'needs_first_login' }, { status: 409 });
  }

  const otp = await requestOtp(driverLoginOtpSubject(driver.id));
  if (!otp.ok) return NextResponse.json({ error: he.auth.otpCooldown, reason: 'cooldown' }, { status: 429 });

  const channels = await deliverOtp({ code: otp.code, email: driver.email, phone: driver.phone, allChannels: true });
  return NextResponse.json({ status: 'otp_sent', channels });
}
