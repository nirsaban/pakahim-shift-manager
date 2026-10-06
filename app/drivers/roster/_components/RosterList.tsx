'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { he } from '@/lib/he';
import { Card } from '../../../_components/ui/Card';
import { Badge } from '../../../_components/ui/Badge';
import { EmptyState } from '../../../_components/ui/EmptyState';
import { Input } from '../../../_components/ui/Field';
import { RowLink, shiftHref } from '../../_components/links';

export interface RosterRow {
  id: string;
  name: string;
  mine: boolean;
  /** "04:30–11:20", formatted on the server in Israel time. */
  span: string;
  origin: string | null;
  /** "D01" or "#12". */
  label: string | null;
  source: 'DAILY' | 'WEEKLY' | null;
  status: string;
  trains: string[];
}

/** The day's shifts with a search over name, station, train and link. Each row opens the shift. */
export function RosterList({ rows }: { rows: RosterRow[] }) {
  const t = he.drivers.rosterPage;
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.origin?.toLowerCase().includes(q) ||
        r.label?.toLowerCase().includes(q) ||
        r.trains.some((n) => n.startsWith(q)),
    );
  }, [rows, query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
        <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} aria-label={t.search} className="ps-9" />
      </div>
      <Card className="p-0">
        {shown.length === 0 ? (
          <EmptyState>{t.noResults}</EmptyState>
        ) : (
          <ul className="divide-y divide-border">
            {shown.map((r) => (
              <li key={r.id} className={r.mine ? 'bg-primary-500/5' : undefined}>
                <RowLink href={shiftHref(r.id)}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{r.name}</p>
                      <p className="truncate text-xs text-muted">{[r.origin, r.label].filter(Boolean).join(' · ')}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-semibold text-foreground tabular-nums" dir="ltr">
                        {r.span}
                      </span>
                      <span className="flex gap-1">
                        {r.status === 'SICK' && <Badge tone="warning">{he.dashboard.onSickLeave}</Badge>}
                        {r.status === 'HOLIDAY' && <Badge tone="warning">{he.dashboard.onHoliday}</Badge>}
                        {r.source && <Badge tone={r.source === 'DAILY' ? 'success' : 'info'}>{he.drivers.source[r.source]}</Badge>}
                      </span>
                    </div>
                  </div>
                </RowLink>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
