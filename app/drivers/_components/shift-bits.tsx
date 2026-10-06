import { ArrowLeft, Footprints } from 'lucide-react';
import { he } from '@/lib/he';
import { formatIsraelTime } from '@/lib/time/zone';
import { relativeDayLabel } from '@/lib/driver-roster/display';
import type { Step } from '@/lib/driver-roster/handoffs';
import { Badge } from '../../_components/ui/Badge';
import { StationLink, TrainLink } from './links';

export const span = (s: { startTime: Date; endTime: Date }) => `${formatIsraelTime(s.startTime)}–${formatIsraelTime(s.endTime)}`;

/** Which report a shift came from. Daily is the more up-to-date. */
export function SourceBadge({ source }: { source: 'DAILY' | 'WEEKLY' | null }) {
  if (!source) return null;
  return <Badge tone={source === 'DAILY' ? 'success' : 'info'}>{he.drivers.source[source]}</Badge>;
}

/** Sick / holiday, when the roster admin arranged cover. */
export function StatusBadge({ status }: { status: string }) {
  if (status === 'SICK') return <Badge tone="warning">{he.dashboard.onSickLeave}</Badge>;
  if (status === 'HOLIDAY') return <Badge tone="warning">{he.dashboard.onHoliday}</Badge>;
  return null;
}

/** A shift's line in a list: times, day, a title, a detail line and its badges. */
export function ShiftRowBody({
  shift,
  now,
  title,
  detail,
  showDay = true,
}: {
  shift: { startTime: Date; endTime: Date; date: Date; status: string; source: 'DAILY' | 'WEEKLY' | null };
  now: Date;
  title: string;
  detail?: string | null;
  showDay?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{title}</p>
        <p className="truncate text-xs text-muted">
          {[showDay ? relativeDayLabel(shift.date, now) : null, detail].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-sm font-semibold text-foreground tabular-nums" dir="ltr">
          {span(shift)}
        </span>
        <span className="flex gap-1">
          <StatusBadge status={shift.status} />
          <SourceBadge source={shift.source} />
        </span>
      </div>
    </div>
  );
}

/**
 * A shift's task as a timeline, in time order: stations (each a link to its
 * page) and trains (each a link to the train's page; rides marked "נוסע").
 */
export function StepTimeline({ steps, day }: { steps: Step[]; day: string }) {
  if (steps.length === 0) return <p className="text-sm text-muted">{he.drivers.shiftPage.noTask}</p>;
  return (
    <ol className="relative flex flex-col gap-2 border-s-2 border-border ps-4">
      {steps.map((step, i) => (
        <li key={i} className="relative">
          <span
            className={
              step.kind === 'train'
                ? 'absolute -start-[1.4rem] top-1.5 h-3 w-3 rounded-full border-2 border-surface-raised bg-primary-600'
                : 'absolute -start-[1.3rem] top-2 h-2 w-2 rounded-full bg-border-strong'
            }
          />
          {step.kind === 'train' ? (
            <span className="flex items-center gap-2">
              <TrainLink number={step.number} day={day} passenger={step.passenger} />
              {step.passenger && <Footprints size={14} className="text-muted" />}
            </span>
          ) : (
            <StationLink name={step.name} day={day} className="text-sm text-foreground" />
          )}
        </li>
      ))}
    </ol>
  );
}

/** "מ… ← ל…" for a leg of a train. */
export function FromTo({ from, to, day }: { from: string | null; to: string | null; day: string }) {
  if (!from && !to) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      {from && <StationLink name={from} day={day} />}
      {from && to && <ArrowLeft size={12} />}
      {to && <StationLink name={to} day={day} />}
    </span>
  );
}
