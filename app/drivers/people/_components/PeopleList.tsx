'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { he } from '@/lib/he';
import type { PersonRef } from '@/lib/services/driver-views-service';
import { Card } from '../../../_components/ui/Card';
import { Input } from '../../../_components/ui/Field';
import { ContactButtons, RowLink, personHref } from '../../_components/links';

export function PeopleList({ people }: { people: PersonRef[] }) {
  const t = he.drivers.peoplePage;
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/-/g, '');
    if (!q) return people;
    return people.filter((p) =>
      [p.name, p.workerNumber, p.city, p.phone?.replace(/\D/g, '')].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [people, query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
        <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} aria-label={t.search} className="ps-9" />
      </div>
      <p className="text-xs text-muted">{t.count(shown.length, people.length)}</p>
      <Card className="p-0">
        <ul className="divide-y divide-border">
          {shown.map((p) => (
            <li key={p.id} className="flex items-center pe-4">
              <RowLink href={personHref(p.id)} className="flex-1">
                <p className="truncate font-medium text-foreground">{p.name}</p>
                <p className="truncate text-xs text-muted">{[p.city, p.workerNumber].filter(Boolean).join(' · ')}</p>
              </RowLink>
              <ContactButtons phone={p.phone} name={p.name} compact />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
