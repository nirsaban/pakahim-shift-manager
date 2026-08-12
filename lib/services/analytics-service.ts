import { prisma } from '../db/prisma';

export interface AnalyticsSnapshot {
  coverageRatePercent: number | null; // null when there's no SICK/HOLIDAY shifts to measure against
  coveredShiftCount: number;
  needsCoverageShiftCount: number;
  incidentsByStatus: { open: number; acknowledged: number; resolved: number };
  registrationCompletionPercent: number | null;
  registeredWorkerCount: number;
  totalWorkerCount: number;
  pendingCoverageRequestCount: number;
}

/** Rolling 30-day window (14 back, 16 forward) - enough to be meaningful without scanning
 * the whole shifts table. See docs/screens/admin-dashboard-analytics.md's open question
 * about live vs. snapshot computation. */
function analyticsWindow() {
  const start = new Date();
  start.setDate(start.getDate() - 14);
  const end = new Date();
  end.setDate(end.getDate() + 16);
  return { start, end };
}

export async function getAnalyticsSnapshot(tenantId: string): Promise<AnalyticsSnapshot> {
  const { start, end } = analyticsWindow();

  const [needsCoverageShifts, incidents, workers, pendingCoverageRequestCount] = await Promise.all([
    prisma.shift.findMany({
      where: { tenantId, status: { in: ['SICK', 'HOLIDAY'] }, date: { gte: start, lte: end } },
      select: { replacementId: true },
    }),
    prisma.incident.groupBy({ by: ['status'], where: { tenantId }, _count: true }),
    prisma.user.findMany({ where: { tenantId, role: 'PAKAHIM' }, select: { email: true } }),
    prisma.coverageRequest.count({ where: { tenantId, status: 'PENDING' } }),
  ]);

  const coveredShiftCount = needsCoverageShifts.filter((s) => s.replacementId).length;
  const needsCoverageShiftCount = needsCoverageShifts.length;

  const incidentsByStatus = { open: 0, acknowledged: 0, resolved: 0 };
  for (const row of incidents) {
    if (row.status === 'OPEN') incidentsByStatus.open = row._count;
    if (row.status === 'ACKNOWLEDGED') incidentsByStatus.acknowledged = row._count;
    if (row.status === 'RESOLVED') incidentsByStatus.resolved = row._count;
  }

  const registeredWorkerCount = workers.filter((w) => w.email).length;
  const totalWorkerCount = workers.length;

  return {
    coverageRatePercent: needsCoverageShiftCount > 0 ? Math.round((coveredShiftCount / needsCoverageShiftCount) * 100) : null,
    coveredShiftCount,
    needsCoverageShiftCount,
    incidentsByStatus,
    registrationCompletionPercent: totalWorkerCount > 0 ? Math.round((registeredWorkerCount / totalWorkerCount) * 100) : null,
    registeredWorkerCount,
    totalWorkerCount,
    pendingCoverageRequestCount,
  };
}
