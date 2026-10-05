import { NextRequest, NextResponse } from 'next/server';
import { getDriversTenantId } from '@/lib/db/tenant';
import { driverWorkerNumberSchema } from '@/lib/validation/driver-auth';
import { findDriverByWorkerNumber } from '@/lib/auth/driver-auth';
import { callerIp, rateLimit } from '@/lib/auth/rate-limit';
import { rateLimitedResponse } from '@/lib/auth/rate-limited-response';
import { formatWorkerName } from '@/lib/utils/display-name';
import { he } from '@/lib/he';

/**
 * First login, step one: is this worker number a driver who has not logged in
 * yet? Sends nothing - the code only goes out once the phone has been checked.
 *
 * Like /api/auth/lookup this tells unknown, new and registered apart, which
 * makes it an enumeration oracle; the rate limit is what makes that useless.
 */
const RATE_LIMIT = 30;
const RATE_WINDOW_SECONDS = 15 * 60;

export async function POST(request: NextRequest) {
  const limit = await rateLimit('drv-worker-number', callerIp(request), RATE_LIMIT, RATE_WINDOW_SECONDS);
  if (!limit.ok) return rateLimitedResponse(limit);

  const parsed = driverWorkerNumberSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: he.error.required }, { status: 400 });

  const tenantId = await getDriversTenantId();
  const driver = await findDriverByWorkerNumber(tenantId, parsed.data.workerNumber);
  if (!driver) return NextResponse.json({ error: he.drivers.workerNumberNotFound }, { status: 404 });
  if (driver.email) {
    return NextResponse.json({ error: he.drivers.alreadyRegistered, reason: 'already_registered' }, { status: 409 });
  }

  return NextResponse.json({ status: 'needs_details', name: formatWorkerName(driver) });
}
