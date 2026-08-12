import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { he } from '@/lib/he';

/** Station list for pickers (onboarding home station, admin review). */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: he.error.unauthorized }, { status: 401 });

  const stations = await prisma.station.findMany({
    orderBy: { nameHe: 'asc' },
    select: { id: true, code: true, nameHe: true, isUncertain: true },
  });

  return NextResponse.json({ stations });
}
