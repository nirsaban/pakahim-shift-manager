import { prisma } from '../db/prisma';
import { compareToTeam, computeWorkload, type WorkloadMetrics } from '../roster/workload';
import {
  DEFAULT_WORKLOAD_RANGE,
  workloadWindowFor,
  type WorkloadWindow,
} from '../roster/workload-range';
import { formatWorkerName } from '../utils/display-name';

/**
 * How heavy a worker's roster is, and how that compares to everyone else's.
 *
 * The metrics themselves live in lib/roster/workload.ts and are pure; this layer
 * only decides which shifts to feed them and how to fan the same calculation
 * across a team. Which span "which shifts" means is the caller's choice, out of
 * the three in lib/roster/workload-range.ts.
 */

export type { WorkloadWindow };

/** The window a card opens on before anyone touches the range tabs. */
export function defaultWorkloadWindow(): WorkloadWindow {
  return workloadWindowFor(DEFAULT_WORKLOAD_RANGE);
}

/** A worker's own metrics, plus where they sit against their team. */
export interface WorkerWorkload {
  window: WorkloadWindow;
  metrics: WorkloadMetrics;
  comparison: { teamAverageMinutes: number; differenceMinutes: number } | null;
}

const WORKLOAD_SELECT = { startTime: true, endTime: true, status: true } as const;

export async function getWorkerWorkload(
  workerId: string,
  teamId: string | null,
  window: WorkloadWindow = defaultWorkloadWindow(),
): Promise<WorkerWorkload> {
  const own = await prisma.shift.findMany({
    where: { workerId, startTime: { gte: window.from, lte: window.to } },
    select: WORKLOAD_SELECT,
  });
  const metrics = computeWorkload(own);

  if (!teamId) return { window, metrics, comparison: null };

  // Compared against teammates only — the worker's own rows would drag the
  // average towards their own total and flatten the very gap being measured.
  const teamShifts = await prisma.shift.findMany({
    where: { teamId, workerId: { not: workerId }, startTime: { gte: window.from, lte: window.to } },
    select: { ...WORKLOAD_SELECT, workerId: true },
  });

  const byWorker = new Map<string, { startTime: Date; endTime: Date; status: string }[]>();
  for (const shift of teamShifts) {
    const rows = byWorker.get(shift.workerId);
    if (rows) rows.push(shift);
    else byWorker.set(shift.workerId, [shift]);
  }

  const teamMetrics = [...byWorker.values()].map((rows) => computeWorkload(rows));
  return { window, metrics, comparison: compareToTeam(metrics, teamMetrics) };
}

export interface TeamMemberWorkload {
  workerId: string;
  name: string;
  metrics: WorkloadMetrics;
}

/**
 * Every member's workload across the teams a lead runs, heaviest first.
 *
 * Members with no shifts in the window are kept rather than filtered out: an
 * inspector who was scheduled nothing at all is exactly what a lead balancing a
 * roster needs to see.
 */
export async function getTeamWorkload(
  teamId: string | string[],
  window: WorkloadWindow = defaultWorkloadWindow(),
): Promise<{ window: WorkloadWindow; members: TeamMemberWorkload[]; averageMinutes: number | null }> {
  const teamFilter = Array.isArray(teamId) ? { in: teamId } : teamId;

  const [members, shifts] = await Promise.all([
    prisma.user.findMany({
      where: { teamId: teamFilter, role: 'PAKAHIM' },
      select: { id: true, firstName: true, lastName: true, email: true, workerNumber: true },
    }),
    prisma.shift.findMany({
      where: { teamId: teamFilter, startTime: { gte: window.from, lte: window.to } },
      select: { ...WORKLOAD_SELECT, workerId: true },
    }),
  ]);

  const byWorker = new Map<string, { startTime: Date; endTime: Date; status: string }[]>();
  for (const shift of shifts) {
    const rows = byWorker.get(shift.workerId);
    if (rows) rows.push(shift);
    else byWorker.set(shift.workerId, [shift]);
  }

  const result = members
    .map((member) => ({
      workerId: member.id,
      name: formatWorkerName(member),
      metrics: computeWorkload(byWorker.get(member.id) ?? []),
    }))
    .sort((a, b) => b.metrics.totalMinutes - a.metrics.totalMinutes);

  const worked = result.filter((m) => m.metrics.shiftCount > 0);
  const averageMinutes =
    worked.length > 0
      ? Math.round(worked.reduce((sum, m) => sum + m.metrics.totalMinutes, 0) / worked.length)
      : null;

  return { window, members: result, averageMinutes };
}
