'use client';

import { useMemo, useState } from 'react';
import { Phone, Search, Users } from 'lucide-react';
import { he } from '@/lib/he';
import { Card, CardHeader } from '../../_components/ui/Card';
import { EmptyState } from '../../_components/ui/EmptyState';
import { Input } from '../../_components/ui/Field';

export interface DirectoryRow {
  id: string;
  name: string;
  workerNumber: string | null;
  phone: string | null;
  city: string | null;
  /** "04:30–11:20" and origin, when on the roster day shown. */
  shift: { span: string; origin: string | null } | null;
}

/**
 * The day's roster with everyone's phone and city - the lookup drivers used
 * to do by hand in the emailed file. With no search it lists who is on the
 * roster; a search covers every driver, on shift or not.
 */
export function DriverDirectory({ dayLabel, rows }: { dayLabel: string | null; rows: DirectoryRow[] }) {
  const t = he.drivers.home;
  const [query, setQuery] = useState('');
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

      {!dayLabel && !query && <EmptyState icon={<Users size={28} />}>{t.directoryNoRoster}</EmptyState>}
      {(dayLabel || query) && shown.length === 0 && <EmptyState>{t.noResults}</EmptyState>}

      <ul className="-mx-5 max-h-[36rem] divide-y divide-border overflow-y-auto">
        {shown.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{r.name}</p>
              <p className="truncate text-xs text-muted">
                {[r.shift ? r.shift.origin : t.notOnShift, r.city, r.workerNumber].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {r.shift && (
                <span className="text-sm font-medium text-foreground tabular-nums" dir="ltr">
                  {r.shift.span}
                </span>
              )}
              {r.phone && (
                <a
                  href={`tel:${r.phone.replace(/[^\d+]/g, '')}`}
                  aria-label={t.call(r.name)}
                  title={r.phone}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-sunken text-primary-600 transition-colors hover:bg-primary-500/10"
                >
                  <Phone size={16} />
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
