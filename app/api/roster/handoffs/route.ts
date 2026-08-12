import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { he } from '@/lib/he';
import { getHandoffsForDate } from '@/lib/services/roster-service';
import { stationName } from '@/lib/services/swap-service';
import { rosterQuerySchema, toRosterDate } from '@/lib/validation/roster';

const VIEWER_ROLES = new Set(['TEAM_LEAD', 'SHIBUTZ', 'ADMIN', 'SUPER_ADMIN']);

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role');
  if (!userId || !role) return NextResponse.json({ error: he.error.unauthorized }, { status: 401 });
  if (!VIEWER_ROLES.has(role)) return NextResponse.json({ error: he.error.forbidden }, { status: 403 });

  const parsed = rosterQuerySchema.safeParse({
    date: request.nextUrl.searchParams.get('date') ?? '',
  });
  if (!parsed.success) return NextResponse.json({ error: he.error.required }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { tenantId: true } });
  if (!user) return NextResponse.json({ error: he.error.unauthorized }, { status: 401 });

  const handoffs = await getHandoffsForDate(user.tenantId, toRosterDate(parsed.data.date));

  return NextResponse.json({
    handoffs: handoffs.map((h) => ({
      ...h,
      stationNameHe: stationName(h.station),
    })),
  });
}
