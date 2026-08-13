import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { he } from '@/lib/he';
import { updateProfileSchema } from '@/lib/validation/profile';

/**
 * A worker editing their own details.
 *
 * Scoped to the caller by construction - the id comes from the session header,
 * never from the body - so this cannot be turned into an edit-anyone endpoint.
 * Admin-side editing of other workers stays where it was, behind
 * /api/users/[id] and its role gate.
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: he.error.unauthorized }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      city: true,
      workerNumber: true,
      role: true,
      shiftReminderEnabled: true,
      shiftReminderLeadMinutes: true,
      shiftReminderSound: true,
    },
  });
  if (!user) return NextResponse.json({ error: he.error.unauthorized }, { status: 401 });

  return NextResponse.json({ user });
}

export async function PATCH(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: he.error.unauthorized }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    const invalidPhone = parsed.error.issues.some((i) => i.message === 'invalid_phone');
    return NextResponse.json(
      { error: invalidPhone ? he.settings.errors.invalid_phone : he.error.required },
      { status: 400 },
    );
  }

  const { firstName, lastName, city, phone } = parsed.data;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName,
      lastName: lastName || null,
      city: city || null,
      phone: phone || null,
    },
    select: { firstName: true, lastName: true, city: true, phone: true },
  });

  return NextResponse.json({ ok: true, user });
}
