'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Plus, TriangleAlert, CircleCheck } from 'lucide-react';
import { he } from '@/lib/he';
import { Card, CardHeader } from '../../../_components/ui/Card';
import { Button } from '../../../_components/ui/Button';
import { Field, Input, Select } from '../../../_components/ui/Field';
import { Badge } from '../../../_components/ui/Badge';
import { EmptyState } from '../../../_components/ui/EmptyState';
import { ROLES, type Team, type Worker } from './types';

export function WorkersPanel({ workers, teams }: { workers: Worker[]; teams: Team[] }) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [adding, setAdding] = useState(false);

  const filtered = workers.filter((w) => {
    if (roleFilter && w.role !== roleFilter) return false;
    if (teamFilter && w.teamId !== teamFilter) return false;
    if (search && !w.name.includes(search) && !(w.workerNumber ?? '').includes(search)) return false;
    return true;
  });

  return (
    <Card>
      <CardHeader title={he.admin.manageWorkers} icon={<UserPlus size={16} />} />
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder={he.admin.searchWorkers}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="!w-auto flex-1"
        />
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="!w-auto">
          <option value="">{he.admin.filterByRole}</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <Select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="!w-auto">
          <option value="">{he.admin.filterByTeam}</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>

      <ul className="mt-2 flex flex-col">
        {filtered.map((worker) => (
          <WorkerRow key={worker.id} worker={worker} teams={teams} />
        ))}
      </ul>
      {filtered.length === 0 && <EmptyState icon={<UserPlus size={22} />}>—</EmptyState>}

      {adding ? (
        <AddWorkerForm teams={teams} onDone={() => setAdding(false)} />
      ) : (
        <Button variant="secondary" size="md" onClick={() => setAdding(true)} className="mt-3 w-fit">
          <Plus size={15} />
          {he.admin.addWorker}
        </Button>
      )}
    </Card>
  );
}

function WorkerRow({ worker, teams }: { worker: Worker; teams: Team[] }) {
  const router = useRouter();
  const [error, setError] = useState('');

  async function update(patch: Record<string, unknown>) {
    setError('');
    const res = await fetch(`/api/users/${worker.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? he.error.serverError);
      return;
    }
    router.refresh();
  }

  return (
    <li className="flex flex-col gap-1.5 border-t border-border py-3 first:border-0 first:pt-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{worker.name}</p>
          <p className="text-xs text-muted">{worker.workerNumber}</p>
        </div>
        {!worker.hasRegistered && <Badge tone="warning">{he.admin.noEmailYet}</Badge>}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Select value={worker.role} onChange={(e) => update({ role: e.target.value })} className="!w-auto py-1 text-sm">
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <Select
          value={worker.teamId ?? ''}
          onChange={(e) => update({ teamId: e.target.value || null })}
          className="!w-auto py-1 text-sm"
        >
          <option value="">—</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-danger-fg">
          <TriangleAlert size={12} />
          {error}
        </p>
      )}
    </li>
  );
}

function AddWorkerForm({ teams, onDone }: { teams: Team[]; onDone: () => void }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [workerNumber, setWorkerNumber] = useState('');
  const [role, setRole] = useState('PAKAHIM');
  const [teamId, setTeamId] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, workerNumber, role, teamId: teamId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? he.error.serverError);
        return;
      }
      setDone(true);
      router.refresh();
      setTimeout(onDone, 800);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <p className="mt-3 flex items-center gap-1.5 text-sm text-success-fg">
        <CircleCheck size={14} />
        {he.success.saved}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
      <div className="flex gap-2">
        <Field label={he.onboarding.firstName}>
          <Input required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </Field>
        <Field label={he.onboarding.lastName}>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </Field>
      </div>
      <Field label={he.onboarding.workerNumber}>
        <Input required value={workerNumber} onChange={(e) => setWorkerNumber(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Field label={he.admin.role}>
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={he.admin.team}>
          <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">—</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-sm text-danger-fg">
          <TriangleAlert size={14} />
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting} className="flex-1">
          {he.button.save}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          {he.button.cancel}
        </Button>
      </div>
    </form>
  );
}
