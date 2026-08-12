import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getDefaultTenantId } from '@/lib/db/tenant';
import { registerSchema } from '@/lib/validation/auth';
import { respondWithSession } from '@/lib/auth/login-response';
import { resolveHomeStationForCity } from '@/lib/services/station-service';
import { he } from '@/lib/he';

export async function POST(request: NextRequest) {
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

  // Derive a home station from the city so swap scoring has something to work
  // with from day one. An unrecognised city resolves to null and is queued for
  // admin review rather than guessed - see station-service.
  const { stationId, source } = await resolveHomeStationForCity(city);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { firstName, lastName, city, email, phone, homeStationId: stationId, homeStationSource: source },
  });

  return respondWithSession(updated);
}
