import { BarChart3, CalendarRange, Moon, Repeat, Timer, TriangleAlert, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { he, hoursLabel } from '@/lib/he';
import type { WorkloadMetrics } from '@/lib/roster/workload';
import type { TeamMemberWorkload, WorkerWorkload } from '@/lib/services/workload-service';
import { Card, CardHeader } from '../../_components/ui/Card';
import { Badge } from '../../_components/ui/Badge';
import { EmptyState } from '../../_components/ui/EmptyState';

function shortDate(date: Date): string {
  return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
}

function dayTime(date: Date): string {
  return date.toLocaleString('he-IL', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Metric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-[var(--radius-md)] bg-surface-sunken p-3">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
        {icon}
        {label}
      </span>
      <span className="text-lg font-bold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

/**
 * Rest gaps below the legal eight hours, named one by one.
 *
 * Deliberately not folded into the metric grid: every other number here is
 * informational, and this one is a roster the scheduler has to fix.
 */
function RestWarnings({ metrics }: { metrics: WorkloadMetrics }) {
  if (metrics.restWarnings.length === 0) return null;

  return (
    <div className="mt-4 flex flex-col gap-1.5 rounded-[var(--radius-md)] bg-warning-bg p-3.5 text-warning-fg">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <TriangleAlert size={14} className="shrink-0" />
        {he.workload.restTitle} · {he.workload.restCount(metrics.restWarnings.length)}
      </p>
      <ul className="flex flex-col gap-0.5 text-xs">
        {metrics.restWarnings.map((warning) => (
          <li key={`${warning.previousEnd.getTime()}-${warning.nextStart.getTime()}`}>
            {warning.gapMinutes < 0
              ? he.workload.restOverlap(dayTime(warning.previousEnd), dayTime(warning.nextStart))
              : he.workload.restRow(
                  dayTime(warning.previousEnd),
                  dayTime(warning.nextStart),
                  hoursLabel(warning.gapMinutes),
                )}
          </li>
        ))}
      </ul>
      <p className="text-xs opacity-80">{he.workload.restHint}</p>
    </div>
  );
}

/** How the worker's own roster reads: hours, nights, weekends, rest, and fairness. */
export function WorkloadCard({ workload }: { workload: WorkerWorkload }) {
  const { metrics, comparison, window } = workload;

  return (
    <Card>
      <CardHeader
        title={he.workload.title}
        icon={<BarChart3 size={16} />}
        action={
          <span className="text-xs text-muted">
            {he.workload.range(shortDate(window.from), shortDate(window.to))}
          </span>
        }
      />

      {metrics.shiftCount === 0 && metrics.absenceCount === 0 ? (
        <EmptyState icon={<BarChart3 size={22} />}>{he.workload.empty}</EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Metric
              label={he.workload.shifts}
              value={String(metrics.shiftCount)}
              icon={<CalendarRange size={13} />}
            />
            <Metric
              label={he.workload.totalHours}
              value={hoursLabel(metrics.totalMinutes)}
              icon={<Timer size={13} />}
            />
            <Metric
              label={he.workload.average}
              value={hoursLabel(metrics.averageMinutes)}
              icon={<Timer size={13} />}
            />
            <Metric
              label={he.workload.longest}
              value={hoursLabel(metrics.longestMinutes)}
              icon={<Timer size={13} />}
            />
            <Metric label={he.workload.nights} value={String(metrics.nightShiftCount)} icon={<Moon size={13} />} />
            <Metric
              label={he.workload.weekends}
              value={String(metrics.weekendShiftCount)}
              icon={<CalendarRange size={13} />}
            />
            <Metric
              label={he.workload.daysWorked}
              value={String(metrics.daysWorked)}
              icon={<CalendarRange size={13} />}
            />
            <Metric
              label={he.workload.streak}
              value={String(metrics.longestStreakDays)}
              icon={<Repeat size={13} />}
            />
            {metrics.absenceCount > 0 && (
              <Metric
                label={he.workload.absences}
                value={String(metrics.absenceCount)}
                icon={<CalendarRange size={13} />}
              />
            )}
          </div>

          {/* An hour count means nothing on its own - the question a worker
              actually asks is whether they are carrying more than everyone else. */}
          {comparison && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
              <Users size={14} className="shrink-0" />
              {comparison.differenceMinutes > 30
                ? he.workload.aboveAverage(hoursLabel(comparison.differenceMinutes))
                : comparison.differenceMinutes < -30
                  ? he.workload.belowAverage(hoursLabel(Math.abs(comparison.differenceMinutes)))
                  : he.workload.onAverage}
              {` (${he.workload.teamAverage} ${hoursLabel(comparison.teamAverageMinutes)})`}
            </p>
          )}

          <RestWarnings metrics={metrics} />
        </>
      )}
    </Card>
  );
}

/**
 * The same metrics across a whole team, heaviest first.
 *
 * This is the balancing view: who is carrying the week, who has nothing, and
 * whose roster breaks the rest rule. Members with no shifts stay in the list —
 * an empty row is the most actionable one there is.
 */
export function TeamWorkloadCard({
  members,
  averageMinutes,
  window,
}: {
  members: TeamMemberWorkload[];
  averageMinutes: number | null;
  window: { from: Date; to: Date };
}) {
  return (
    <Card>
      <CardHeader
        title={he.workload.teamTitle}
        icon={<BarChart3 size={16} />}
        action={
          <span className="text-xs text-muted">
            {he.workload.range(shortDate(window.from), shortDate(window.to))}
          </span>
        }
      />

      {members.length === 0 ? (
        <EmptyState icon={<Users size={22} />}>{he.workload.empty}</EmptyState>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted">
            {he.workload.teamSubtitle}
            {averageMinutes !== null && ` · ${he.workload.teamAverage} ${hoursLabel(averageMinutes)}`}
          </p>
          <ul className="flex flex-col">
            {members.map((member) => (
              <li
                key={member.workerId}
                className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-2.5 first:border-0 first:pt-0"
              >
                <span className="font-medium text-foreground">{member.name}</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {member.metrics.shiftCount === 0 ? (
                    <Badge tone="neutral">{he.workload.noShifts}</Badge>
                  ) : (
                    <>
                      <Badge tone="neutral">
                        {member.metrics.shiftCount} {he.workload.shifts}
                      </Badge>
                      <Badge tone="info">{hoursLabel(member.metrics.totalMinutes)}</Badge>
                      {member.metrics.nightShiftCount > 0 && (
                        <Badge tone="neutral" icon={<Moon size={12} />}>
                          {member.metrics.nightShiftCount}
                        </Badge>
                      )}
                      {member.metrics.restWarnings.length > 0 && (
                        <Badge tone="warning" icon={<TriangleAlert size={12} />}>
                          {member.metrics.restWarnings.length}
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
