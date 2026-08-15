import { CalendarDays, MapPin, ShieldCheck } from 'lucide-react';
import { he, hoursLabel } from '@/lib/he';
import {
  addIsraelDays,
  formatIsraelDate,
  formatIsraelTime,
  israelMidnight,
  startOfIsraelDay,
} from '@/lib/time/zone';
import type { ScheduleEntry } from '@/lib/services/worker-shift-service';
import { Card, CardHeader } from '../../_components/ui/Card';
import { Badge } from '../../_components/ui/Badge';
import { EmptyState } from '../../_components/ui/EmptyState';
import { ShiftDetailBody } from './ShiftDetail';

const hhmm = formatIsraelTime;

/** "היום" / "מחר" beat a date an inspector then has to decode on a platform. */
function dayHeading(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = israelMidnight(y, m, d);

  // Calendar days apart in ISRAEL - not (ms / 86400000), which is an hour out
  // on each side of a DST switch and would relabel "today" as "tomorrow".
  const today = startOfIsraelDay(new Date());
  let diffDays = 0;
  while (diffDays < 3 && addIsraelDays(today, diffDays).getTime() < date.getTime()) diffDays += 1;
  if (date.getTime() !== addIsraelDays(today, diffDays).getTime()) diffDays = -1;
  if (diffDays === 0) return he.schedule.today;
  if (diffDays === 1) return he.schedule.tomorrow;

  return formatIsraelDate(date, { weekday: 'long', day: '2-digit', month: '2-digit' });
}

function groupByDate(entries: ScheduleEntry[]): { date: string; entries: ScheduleEntry[] }[] {
  const groups: { date: string; entries: ScheduleEntry[] }[] = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    if (last && last.date === entry.date) last.entries.push(entry);
    else groups.push({ date: entry.date, entries: [entry] });
  }
  return groups;
}

/**
 * Every shift the worker holds in the window, grouped by day.
 *
 * The three-shift card above answers "what am I doing now". This is the other
 * question the client actually asked for — a worker seeing their whole week the
 * moment scheduling uploads it, instead of re-reading the Excel each morning.
 * A SICK / HOLIDAY day still appears, so they can confirm a cover was assigned.
 */
export function MySchedule({ entries, days }: { entries: ScheduleEntry[]; days: number }) {
  const groups = groupByDate(entries);

  return (
    <Card>
      <CardHeader
        title={he.schedule.title}
        icon={<CalendarDays size={16} />}
        action={
          entries.length > 0 ? (
            <span className="text-xs text-muted">{he.schedule.countInRange(entries.length, days)}</span>
          ) : null
        }
      />

      {groups.length === 0 ? (
        <EmptyState icon={<CalendarDays size={22} />}>{he.schedule.empty}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {groups.map((group) => (
            <li key={group.date} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">{dayHeading(group.date)}</span>
                {group.entries.length > 1 && (
                  <span className="text-xs text-muted">{he.schedule.shiftsOnDay(group.entries.length)}</span>
                )}
              </div>

              {group.entries.map((entry) => (
                <div
                  key={entry.shiftId}
                  className="flex flex-col gap-1.5 rounded-[var(--radius-md)] bg-surface-sunken p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-base font-semibold tabular-nums text-foreground">
                      {hhmm(entry.startTime)} – {hhmm(entry.endTime)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {entry.status === 'SICK' && <Badge tone="warning">{he.dashboard.onSickLeave}</Badge>}
                      {entry.status === 'HOLIDAY' && <Badge tone="info">{he.dashboard.onHoliday}</Badge>}
                      <Badge tone="neutral">{hoursLabel(entry.durationMinutes)}</Badge>
                    </div>
                  </div>

                  {(entry.startStationHe || entry.endStationHe) && (
                    <span className="flex items-center gap-1 text-sm text-muted">
                      <MapPin size={13} className="shrink-0" />
                      {entry.startStationHe ?? '—'} → {entry.endStationHe ?? '—'}
                    </span>
                  )}

                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    {entry.serial && <span>{he.roster.myShift.serial} {entry.serial}</span>}
                    {entry.serial && entry.region && <span>&middot;</span>}
                    {entry.region && <span>{entry.region}</span>}
                    {entry.routeNote && (
                      <>
                        <span>&middot;</span>
                        <span>{entry.routeNote}</span>
                      </>
                    )}
                  </div>

                  {entry.replacementName && (
                    <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                      <ShieldCheck size={13} className="shrink-0" />
                      {he.schedule.coveredBy} {entry.replacementName}
                    </span>
                  )}

                  {/* Native <details>: the whole list stays server-rendered and
                      keeps working offline, which is the point of the PWA. */}
                  {entry.duty && (
                    <details className="mt-1 border-t border-border pt-2">
                      <summary className="cursor-pointer text-sm font-medium text-muted">
                        {he.schedule.fullDetails}
                      </summary>
                      <div className="mt-2">
                        <ShiftDetailBody
                          duty={entry.duty}
                          takesOverFrom={entry.handoffs.takesOverFrom}
                          handsOverTo={entry.handoffs.handsOverTo}
                        />
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
