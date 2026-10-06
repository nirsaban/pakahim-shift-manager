import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { requireDriver } from '@/lib/auth/driver-page';
import {
  dayParam,
  defaultDay,
  getPublishedDays,
  loadDayShifts,
  parseDayParam,
} from '@/lib/services/driver-views-service';
import { relativeDayLabel } from '@/lib/driver-roster/display';
import { formatIsraelDate } from '@/lib/time/zone';
import { he } from '@/lib/he';
import { cn } from '@/lib/utils/cn';
import { Card } from '../../_components/ui/Card';
import { EmptyState } from '../../_components/ui/EmptyState';
import { DriverHeader } from '../_components/DriverHeader';
import { rosterHref } from '../_components/links';
import { span } from '../_components/shift-bits';
import { RosterList, type RosterRow } from './_components/RosterList';

/**
 * Any published roster day, daily or weekly: a strip of the days to move
 * between, then every shift that day - each opening its own page.
 */
export default async function DriversRosterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireDriver();
  const now = new Date();
  const days = await getPublishedDays(user.tenantId);
  const day = parseDayParam((await searchParams).day) ?? defaultDay(days, now);
  const t = he.drivers.rosterPage;

  if (!day) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6">
        <DriverHeader />
        <Card className="mt-4">
          <EmptyState>{t.noRoster}</EmptyState>
        </Card>
      </main>
    );
  }

  const shifts = await loadDayShifts(user.tenantId, day);
  const index = days.findIndex((d) => d.date.getTime() === day.getTime());
  const prev = index > 0 ? days[index - 1].date : null;
  const next = index >= 0 && index < days.length - 1 ? days[index + 1].date : null;

  const rows: RosterRow[] = shifts.map((s) => ({
    id: s.id,
    name: s.worker.name,
    mine: s.worker.id === user.id,
    span: span(s),
    origin: s.originStation,
    label: s.link ?? (s.serial !== null ? `#${s.serial}` : null),
    source: s.source,
    status: s.status,
    trains: s.steps.flatMap((x) => (x.kind === 'train' && !x.passenger ? [x.number] : [])),
  }));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6">
      <DriverHeader />

      <div className="flex flex-col gap-4 pt-4">
        <div className="flex items-center justify-between gap-2">
          <DayStep to={prev} label={t.prev} icon={<ChevronRight size={18} />} />
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground">{relativeDayLabel(day, now)}</h1>
            <p className="text-xs text-muted">
              {formatIsraelDate(day, { day: 'numeric', month: 'numeric', year: 'numeric' })} · {t.count(shifts.length)}
            </p>
          </div>
          <DayStep to={next} label={t.next} icon={<ChevronLeft size={18} />} />
        </div>

        {/* Every published day, so a week uploaded ahead is one tap away. */}
        <nav aria-label={t.title} className="-mx-6 overflow-x-auto px-6 pb-1">
          <ul className="flex w-max gap-1.5">
            {days.map((d) => {
              const active = d.date.getTime() === day.getTime();
              return (
                <li key={d.date.toISOString()}>
                  <Link
                    href={rosterHref(dayParam(d.date))}
                    aria-current={active ? 'date' : undefined}
                    className={cn(
                      'flex flex-col items-center rounded-[var(--radius-md)] px-3 py-1.5 text-xs transition-colors',
                      active ? 'bg-primary-600 text-white' : 'bg-surface-sunken text-muted hover:text-foreground',
                    )}
                  >
                    <span className="font-semibold">{formatIsraelDate(d.date, { weekday: 'short' })}</span>
                    <span className="tabular-nums">{formatIsraelDate(d.date, { day: 'numeric', month: 'numeric' })}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <RosterList rows={rows} />
      </div>
    </main>
  );
}

function DayStep({ to, label, icon }: { to: Date | null; label: string; icon: ReactNode }) {
  const cls = 'flex h-10 w-10 items-center justify-center rounded-full bg-surface-sunken';
  return to ? (
    <Link href={rosterHref(dayParam(to))} aria-label={label} className={cn(cls, 'text-foreground hover:bg-primary-500/15')}>
      {icon}
    </Link>
  ) : (
    <span aria-hidden className={cn(cls, 'text-border-strong')}>
      {icon}
    </span>
  );
}
