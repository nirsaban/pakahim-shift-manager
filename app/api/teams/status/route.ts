import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getTeamStatus } from '@/lib/services/team-service';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.teamId) return NextResponse.json({ members: [] });

  const members = await getTeamStatus(user.teamId);
  return NextResponse.json({ members });
}
