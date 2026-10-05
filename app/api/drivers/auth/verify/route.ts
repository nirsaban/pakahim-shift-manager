import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getDriversTenantId } from '@/lib/db/tenant';
import { driverVerifySchema } from '@/lib/validation/driver-auth';
import {
  clearPendingDriverEmail,
  driverLoginOtpSubject,
  driverRegistrationOtpSubject,
  findDriverByWorkerNumber,
  findDriversByPhone,
  loadPendingDriverEmail,
} from '@/lib/auth/driver-auth';
import { verifyOtp } from '@/lib/auth/otp';
import { respondWithSession } from '@/lib/auth/login-response';
import { callerIp, rateLimit } from '@/lib/auth/rate-limit';
import { rateLimitedResponse } from '@/lib/auth/rate-limited-response';
import { he } from '@/lib/he';

/**
 * Checks a driver's code and opens a drivers session. A first login sends its
 * worker number and gets its email saved here; a returning driver sends their
 * phone.
 */

// verifyOtp already kills a code after 5 wrong guesses; this bounds cycling
// fresh codes, as on the פקחים /otp/verify.
const RATE_LIMIT = 40;
const RATE_WINDOW_SECONDS = 15 * 60;

const invalidOtp = () => NextResponse.json({ error: he.auth.invalidOtp }, { status: 401 });

export async function POST(request: NextRequest) {
  const limit = await rateLimit('drv-verify', callerIp(request), RATE_LIMIT, RATE_WINDOW_SECONDS);
  if (!limit.ok) return rateLimitedResponse(limit);

  const parsed = driverVerifySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: he.auth.invalidOtp }, { status: 400 });

  const tenantId = await getDriversTenantId();
  return 'workerNumber' in parsed.data
    ? completeFirstLogin(tenantId, parsed.data.workerNumber, parsed.data.otp)
    : completePhoneLogin(tenantId, parsed.data.phone, parsed.data.otp);
}

async function completePhoneLogin(tenantId: string, phone: string, otp: string): Promise<NextResponse> {
  const drivers = await findDriversByPhone(tenantId, phone);
  // Every failure reads as a bad code: the /phone step already told the caller
  // what it could, and this one should not answer anything new.
  if (drivers.length !== 1 || !drivers[0].email) return invalidOtp();
  if (!(await verifyOtp(driverLoginOtpSubject(drivers[0].id), otp))) return invalidOtp();
  return respondWithSession(drivers[0], 'drivers');
}

async function completeFirstLogin(tenantId: string, workerNumber: string, otp: string): Promise<NextResponse> {
  const driver = await findDriverByWorkerNumber(tenantId, workerNumber);
  const email = await loadPendingDriverEmail(tenantId, workerNumber);
  if (!driver || driver.email || !email) return invalidOtp();
  if (!(await verifyOtp(driverRegistrationOtpSubject(tenantId, workerNumber), otp))) return invalidOtp();

  try {
    // Guarded on `email: null` so two first logins racing for one driver
    // cannot both win: the second finds nothing left to claim.
    const claimed = await prisma.user.updateMany({ where: { id: driver.id, email: null }, data: { email } });
    if (claimed.count === 0) {
      await clearPendingDriverEmail(tenantId, workerNumber);
      return NextResponse.json({ error: he.drivers.alreadyRegistered }, { status: 409 });
    }
  } catch (err) {
    // Checked at /register, but another driver may have taken the address since.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      await clearPendingDriverEmail(tenantId, workerNumber);
      return NextResponse.json({ error: he.error.emailTaken }, { status: 409 });
    }
    throw err;
  }

  await clearPendingDriverEmail(tenantId, workerNumber);
  return respondWithSession(driver, 'drivers');
}
