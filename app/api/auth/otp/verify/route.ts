import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getDefaultTenantId } from '@/lib/db/tenant';
import { workerNumberOtpSchema } from '@/lib/validation/auth';
import { verifyOtp } from '@/lib/auth/otp';
import { respondWithSession } from '@/lib/auth/login-response';
import { he } from '@/lib/he';

export async function POST(request: NextRequest) {
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
  if (!user?.email) {
    return NextResponse.json({ error: he.error.workerNumberNotFound }, { status: 404 });
  }

  const valid = await verifyOtp(user.email, otp);
  if (!valid) {
    return NextResponse.json({ error: he.auth.invalidOtp }, { status: 401 });
  }

  return respondWithSession(user);
}
