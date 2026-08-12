import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { he } from '@/lib/he';
import { setHomeStationSchema } from '@/lib/validation/roster';

/**
 * A worker setting (or clearing) their own home station. Explicit self-selection
 * always beats whatever was derived from their free-text city.
 */
export async function PATCH(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: he.error.unauthorized }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = setHomeStationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: he.error.required }, { status: 400 });

  const { stationId } = parsed.data;
  if (stationId) {
    const station = await prisma.station.findUnique({ where: { id: stationId }, select: { id: true } });
    if (!station) return NextResponse.json({ error: he.error.notFound }, { status: 404 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      homeStationId: stationId,
      homeStationSource: stationId ? 'SELF_SELECTED' : 'UNKNOWN',
    },
    select: { homeStationId: true, homeStation: { select: { code: true, nameHe: true } } },
  });

  return NextResponse.json({ homeStation: user.homeStation });
}
