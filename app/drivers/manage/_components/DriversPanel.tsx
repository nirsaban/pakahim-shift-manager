'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Search, TriangleAlert } from 'lucide-react';
import { he } from '@/lib/he';
import type { DriverListEntry } from '@/lib/services/driver-admin-service';
import { Card } from '../../../_components/ui/Card';
import { Badge } from '../../../_components/ui/Badge';
import { Button } from '../../../_components/ui/Button';
import { Field, Input } from '../../../_components/ui/Field';

type Filter = 'all' | 'cannotLogin' | 'notRegistered';

/** A driver who could not complete a login: no worker number or no phone. */
const cannotLogin = (d: DriverListEntry) => !d.workerNumber || !d.phone;

export function DriversPanel({ drivers }: { drivers: DriverListEntry[] }) {
  const t = he.drivers.manage;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<string | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return drivers.filter((d) => {
      if (filter === 'cannotLogin' && !cannotLogin(d)) return false;
      if (filter === 'notRegistered' && d.registered) return false;
      if (!q) return true;
      return [d.firstName, d.workerNumber, d.phone?.replace(/\D/g, ''), d.city].some((v) =>
        v?.toLowerCase().includes(q.replace(/-/g, '')),
      );
    });
  }, [drivers, query, filter]);

  const filters: [Filter, string, number][] = [
    ['all', t.filterAll, drivers.length],
    ['cannotLogin', t.filterCannotLogin, drivers.filter(cannotLogin).length],
    ['notRegistered', t.filterNotRegistered, drivers.filter((d) => !d.registered).length],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
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

      <div role="radiogroup" className="flex flex-wrap gap-1.5">
        {filters.map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={filter === value}
            onClick={() => setFilter(value)}
            className={
              filter === value
                ? 'rounded-full bg-primary-600 px-3 py-1 text-sm font-medium text-white'
                : 'rounded-full bg-surface-sunken px-3 py-1 text-sm text-muted hover:text-foreground'
            }
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {editing === 'new' ? (
        <DriverForm onDone={() => setEditing(null)} />
      ) : (
        <Button type="button" variant="secondary" size="lg" onClick={() => setEditing('new')} className="w-full">
          <Plus size={16} />
          {t.add}
        </Button>
      )}

      <p className="text-xs text-muted">{t.count(shown.length, drivers.length)}</p>

      <Card className="p-0">
        <ul className="divide-y divide-border">
          {shown.map((d) =>
            editing === d.id ? (
              <li key={d.id} className="p-4">
                <DriverForm driver={d} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 font-medium text-foreground">
                    {d.firstName}
                    {d.isRosterAdmin && <Badge tone="info">{t.rosterAdmin}</Badge>}
                    {cannotLogin(d) ? (
                      <Badge tone="danger">{t.cannotLogin}</Badge>
                    ) : (
                      <Badge tone={d.registered ? 'success' : 'neutral'}>{d.registered ? t.registered : t.notRegistered}</Badge>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted" dir="auto">
                    {[d.workerNumber, d.phone, d.city].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setEditing(d.id)}
                  aria-label={`${t.edit} ${d.firstName ?? ''}`}
                >
                  <Pencil size={15} />
                </Button>
              </li>
            ),
          )}
        </ul>
      </Card>
    </div>
  );
}

function DriverForm({ driver, onDone }: { driver?: DriverListEntry; onDone: () => void }) {
  const t = he.drivers.manage;
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: driver?.firstName ?? '',
    workerNumber: driver?.workerNumber ?? '',
    phone: driver?.phone ?? '',
    city: driver?.city ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch(driver ? `/api/drivers/workers/${driver.id}` : '/api/drivers/workers', {
        method: driver ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? he.error.serverError);
        return;
      }
      onDone();
      router.refresh();
    } catch {
      setError(he.error.networkError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-[var(--radius-md)] bg-surface-sunken p-4">
      <Field label={t.name}>
        <Input required minLength={2} value={form.firstName} onChange={set('firstName')} autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.workerNumber}>
          <Input inputMode="numeric" value={form.workerNumber} onChange={set('workerNumber')} dir="ltr" />
        </Field>
        <Field label={t.phone}>
          <Input type="tel" value={form.phone} onChange={set('phone')} dir="ltr" />
        </Field>
      </div>
      <Field label={t.city}>
        <Input value={form.city} onChange={set('city')} />
      </Field>
      {error && (
        <p className="flex items-center gap-1.5 text-sm text-danger-fg">
          <TriangleAlert size={14} className="shrink-0" />
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="md" disabled={saving}>
          {t.save}
        </Button>
        <Button type="button" size="md" variant="ghost" onClick={onDone}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
