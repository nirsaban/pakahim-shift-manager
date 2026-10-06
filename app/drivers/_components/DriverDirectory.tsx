'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, MapPin, Phone, Radio, Search, UserRound, Users } from 'lucide-react';
import { he } from '@/lib/he';
import { Card, CardHeader } from '../../_components/ui/Card';
import { EmptyState } from '../../_components/ui/EmptyState';
import { Input } from '../../_components/ui/Field';
import { HandoffList, type HandoffView } from './HandoffList';
import { TrainChips } from './TrainChips';

export interface DirectoryRow {
  id: string;
  name: string;
  workerNumber: string | null;
  phone: string | null;
  city: string | null;
  /** Their work on the roster day shown, formatted on the server in Israel time. */
  shift: {
    span: string;
    origin: string | null;
    mirs: string | null;
    task: string | null;
    trainNumbers: string[];
    companion: string | null;
    takesOverFrom: HandoffView[];
    handsOverTo: HandoffView[];
  } | null;
}

/**
 * The day's roster with everyone's phone and city - the lookup drivers used
 * to do by hand in the emailed file. With no search it lists who is on the
 * roster; a search covers every driver, on shift or not. Tapping a driver who
 * works that day opens their work: task, trains, and who they take a train
 * over from or hand one to, and where.
 */
export function DriverDirectory({ dayLabel, rows }: { dayLabel: string | null; rows: DirectoryRow[] }) {
  const t = he.drivers.home;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const onShift = rows.filter((r) => r.shift).length;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows.filter((r) => r.shift);
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.workerNumber?.startsWith(q) ||
        r.city?.toLowerCase().includes(q),
    );
  }, [rows, query]);

  return (
    <Card>
      <CardHeader
        title={dayLabel ? `${t.directoryTitle} · ${dayLabel}` : t.directoryTitle}
        icon={<Users size={18} />}
        action={dayLabel ? <span className="text-xs text-muted">{t.onShiftCount(onShift)}</span> : undefined}
      />

      <div className="relative mb-3">
        <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search}
          aria-label={t.search}
          className="ps-9"
        />
      </div>

      {dayLabel && onShift > 0 && <p className="mb-2 text-xs text-muted">{he.drivers.day.tapHint}</p>}
      {!dayLabel && !query && <EmptyState icon={<Users size={28} />}>{t.directoryNoRoster}</EmptyState>}
      {(dayLabel || query) && shown.length === 0 && <EmptyState>{t.noResults}</EmptyState>}

      <ul className="-mx-5 max-h-[36rem] divide-y divide-border overflow-y-auto">
        {shown.map((r) => {
          const expanded = open === r.id && r.shift;
          return (
            <li key={r.id} className="px-5 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={!r.shift}
                  onClick={() => setOpen(expanded ? null : r.id)}
                  aria-expanded={Boolean(expanded)}
                  aria-label={r.shift ? he.drivers.day.showWork(r.name) : undefined}
                  className="flex min-w-0 flex-1 items-center gap-2 text-start disabled:cursor-default"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{r.name}</p>
                    <p className="truncate text-xs text-muted">
                      {[r.shift ? r.shift.origin : t.notOnShift, r.city, r.workerNumber].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {r.shift && (
                    <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-foreground tabular-nums">
                      <span dir="ltr">{r.shift.span}</span>
                      <ChevronDown size={15} className={expanded ? 'rotate-180 text-muted transition-transform' : 'text-muted transition-transform'} />
                    </span>
                  )}
                </button>
                {r.phone && (
                  <a
                    href={`tel:${r.phone.replace(/[^\d+]/g, '')}`}
                    aria-label={t.call(r.name)}
                    title={r.phone}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-primary-600 transition-colors hover:bg-primary-500/10"
                  >
                    <Phone size={16} />
                  </a>
                )}
              </div>
              {expanded && r.shift && <DayWork shift={r.shift} />}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** One driver's work that day, opened from the list. */
function DayWork({ shift }: { shift: NonNullable<DirectoryRow['shift']> }) {
  const t = he.drivers.home;
  return (
    <div className="mt-3 flex flex-col gap-3 rounded-[var(--radius-md)] border border-border p-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span className="flex items-center gap-1 text-foreground">
          <MapPin size={13} className="text-muted" />
          {shift.origin ?? '—'}
        </span>
        {shift.mirs && (
          <span className="flex items-center gap-1 text-foreground">
            <Radio size={13} className="text-muted" />
            {t.mirs} {shift.mirs}
          </span>
        )}
      </div>
      {shift.task && (
        <div>
          <p className="text-xs font-medium text-muted">{t.task}</p>
          <p className="text-sm leading-relaxed text-foreground">{shift.task}</p>
        </div>
      )}
      <TrainChips task={shift.task} fallback={shift.trainNumbers} size="sm" />
      {shift.companion && (
        <p className="flex items-center gap-1.5 text-sm text-foreground">
          <UserRound size={14} className="text-muted" />
          {shift.companion}
        </p>
      )}
      <div className="border-t border-border pt-3">
        <p className="mb-2 text-xs font-semibold text-foreground">{he.drivers.handoffs.title}</p>
        <HandoffList takesOverFrom={shift.takesOverFrom} handsOverTo={shift.handsOverTo} person="them" />
      </div>
    </div>
  );
}
