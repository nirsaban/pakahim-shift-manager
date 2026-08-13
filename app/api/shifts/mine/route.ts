import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { he } from '@/lib/he';
import { getWorkerSchedule } from '@/lib/services/worker-shift-service';
import { getWorkerWorkload } from '@/lib/services/workload-service';
import { myShiftsQuerySchema } from '@/lib/validation/shifts';

/**
 * A worker's whole schedule, not just their next shift.
 *
 * Always scoped to the caller: there is no workerId parameter, so this cannot
 * become a way for one inspector to read another's roster. The workload block
 * rides along because the dashboard shows both together and they share a window.
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: he.error.unauthorized }, { status: 401 });

  const parsed = myShiftsQuerySchema.safeParse({
    daysBack: request.nextUrl.searchParams.get('daysBack') ?? undefined,
    daysForward: request.nextUrl.searchParams.get('daysForward') ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: he.error.required }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { teamId: true } });
  if (!user) return NextResponse.json({ error: he.error.unauthorized }, { status: 401 });

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - parsed.data.daysBack);
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  to.setDate(to.getDate() + parsed.data.daysForward);

  const [shifts, workload] = await Promise.all([
    getWorkerSchedule(userId, { from, to }),
    getWorkerWorkload(userId, user.teamId, { from, to }),
  ]);

  return NextResponse.json({
    from: from.toISOString(),
    to: to.toISOString(),
    shifts,
    workload: { metrics: workload.metrics, comparison: workload.comparison },
  });
}
