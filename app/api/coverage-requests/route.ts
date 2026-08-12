import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requestCoverageSchema } from '@/lib/validation/coverage';
import { listPendingCoverageRequests, requestCoverage } from '@/lib/services/coverage-service';
import { he, coverageErrorMessage } from '@/lib/he';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role');
  if (!userId || !role) return NextResponse.json({ error: he.error.unauthorized }, { status: 401 });

  let teamIds: string[];
  if (role === 'TEAM_LEAD') {
    const led = await prisma.team.findMany({ where: { teamLeadId: userId }, select: { id: true } });
    teamIds = led.map((t) => t.id);
  } else if (role === 'SHIBUTZ' || role === 'ADMIN' || role === 'SUPER_ADMIN') {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const teams = await prisma.team.findMany({ where: { tenantId: user?.tenantId }, select: { id: true } });
    teamIds = teams.map((t) => t.id);
  } else {
    return NextResponse.json({ error: he.error.forbidden }, { status: 403 });
  }

  const requests = await listPendingCoverageRequests(teamIds);
  return NextResponse.json({ requests });
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: he.error.unauthorized }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = requestCoverageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: he.error.required }, { status: 400 });
  }

  const result = await requestCoverage(userId, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: coverageErrorMessage(result.error) }, { status: result.status });
  }
  return NextResponse.json({ id: result.data.id });
}
