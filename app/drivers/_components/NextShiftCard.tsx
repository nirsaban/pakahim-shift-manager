import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowDownLeft, ArrowUpLeft, CalendarClock, ChevronLeft, MapPin, Radio } from 'lucide-react';
import { he } from '@/lib/he';
import { relativeDayLabel, isOnShift } from '@/lib/driver-roster/display';
import { dayParam, type HandoffRef, type ShiftDetail } from '@/lib/services/driver-views-service';
import { Card } from '../../_components/ui/Card';
import { Badge } from '../../_components/ui/Badge';
import { EmptyState } from '../../_components/ui/EmptyState';
import { ContactButtons, StationLink, TrainLink, shiftHref } from './links';
import { SourceBadge, StatusBadge, span } from './shift-bits';

/** The driver's next shift at a glance - every part of it leading to its own page. */
export function NextShiftCard({ shift, now }: { shift: ShiftDetail | null; now: Date }) {
  const t = he.drivers.home;
  if (!shift) {
    return (
      <Card>
        <EmptyState icon={<CalendarClock size={28} />}>{t.noShift}</EmptyState>
      </Card>
    );
  }
  const day = dayParam(shift.date);
  const driven = [...new Set(shift.steps.flatMap((s) => (s.kind === 'train' && !s.passenger ? [s.number] : [])))];

  return (
    <Card className="p-0">
      <Link href={shiftHref(shift.id)} className="brand-gradient block rounded-t-[var(--radius-lg)] p-5 text-white">
        <div className="flex items-center justify-between gap-2 text-sm text-white/85">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock size={15} />
            {t.myShift} · {relativeDayLabel(shift.date, now)}
          </span>
          <span className="flex gap-1">
            {isOnShift(shift, now) && shift.status !== 'SICK' && shift.status !== 'HOLIDAY' && <Badge tone="success">{t.onShiftNow}</Badge>}
            <StatusBadge status={shift.status} />
            <SourceBadge source={shift.source} />
          </span>
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="text-4xl font-bold tabular-nums" dir="ltr">
            {span(shift)}
          </p>
          <span className="inline-flex items-center gap-0.5 text-sm text-white/85">
            {he.drivers.quick.details}
            <ChevronLeft size={16} />
          </span>
        </div>
      </Link>

      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {shift.originStation && (
            <span className="inline-flex items-center gap-1 text-muted">
              <MapPin size={14} />
              <StationLink name={shift.originStation} day={day} className="font-medium text-foreground" />
            </span>
          )}
          {shift.mirs && (
            <span className="inline-flex items-center gap-1 text-muted">
              <Radio size={14} />
              {t.mirs} <span className="font-medium text-foreground">{shift.mirs}</span>
            </span>
          )}
        </div>

        {shift.replacement && (
          <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-warning-bg px-3.5 py-2.5 text-warning-fg">
            <div>
              <p className="text-xs">{he.dashboard.replacement}</p>
              <Link href={`/drivers/people/${shift.replacement.id}`} className="font-semibold underline-offset-2 hover:underline">
                {shift.replacement.name}
              </Link>
            </div>
            <ContactButtons phone={shift.replacement.phone} name={shift.replacement.name} compact />
          </div>
        )}

        {driven.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {driven.map((n) => (
              <TrainLink key={n} number={n} day={day} />
            ))}
          </div>
        )}

        {(shift.takesOverFrom.length > 0 || shift.handsOverTo.length > 0) && (
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <Handoffs title={he.drivers.handoffs.takesOverFrom} icon={<ArrowDownLeft size={14} />} refs={shift.takesOverFrom} day={day} />
            <Handoffs title={he.drivers.handoffs.handsOverTo} icon={<ArrowUpLeft size={14} />} refs={shift.handsOverTo} day={day} />
          </div>
        )}
      </div>
    </Card>
  );
}

function Handoffs({ title, icon, refs, day }: { title: string; icon: ReactNode; refs: HandoffRef[]; day: string }) {
  if (refs.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
        {icon}
        {title}
      </p>
      {refs.map((h) => (
        <div key={`${h.shiftId}-${h.trainNumber}`} className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] bg-surface-sunken px-3 py-2">
          <Link href={shiftHref(h.shiftId)} className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{h.person.name}</p>
            <p className="text-xs text-muted tabular-nums" dir="ltr">
              {span(h)}
            </p>
          </Link>
          <TrainLink number={h.trainNumber} day={day} size="sm" />
          {h.station && <StationLink name={h.station} day={day} className="text-xs text-muted" />}
          <ContactButtons phone={h.person.phone} name={h.person.name} compact />
        </div>
      ))}
    </div>
  );
}
