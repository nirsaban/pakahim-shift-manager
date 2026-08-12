'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, TriangleAlert } from 'lucide-react';
import { he } from '@/lib/he';
import { Card, CardHeader } from '../../../_components/ui/Card';
import { Button } from '../../../_components/ui/Button';
import { Field, Input, Select } from '../../../_components/ui/Field';
import { Badge } from '../../../_components/ui/Badge';
import { EmptyState } from '../../../_components/ui/EmptyState';
import type { Team, Worker } from './types';

export function TeamsPanel({ teams, teamLeads }: { teams: Team[]; teamLeads: Worker[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [teamLeadId, setTeamLeadId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, teamLeadId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? he.error.serverError);
        return;
      }
      setName('');
      setTeamLeadId('');
      setAdding(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function reassignLead(teamId: string, newLeadId: string) {
    await fetch(`/api/teams/${teamId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamLeadId: newLeadId }),
    });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader title={he.admin.manageTeams} icon={<Users size={16} />} />
      <ul className="flex flex-col">
        {teams.map((team) => (
          <li key={team.id} className="flex flex-col gap-2 border-t border-border py-3 first:border-0 first:pt-0">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-foreground">{team.name}</span>
              <Badge tone="neutral">{team.memberCount}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted">
              <span>{he.admin.teamLead}:</span>
              <Select
                value={team.teamLeadId}
                onChange={(e) => reassignLead(team.id, e.target.value)}
                className="!w-auto py-1 text-sm"
              >
                {teamLeads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.name}
                  </option>
                ))}
              </Select>
            </div>
          </li>
        ))}
      </ul>
      {teams.length === 0 && <EmptyState icon={<Users size={22} />}>—</EmptyState>}

      {adding ? (
        <form onSubmit={handleAdd} className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
          <Field label={he.admin.teamName}>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={he.admin.teamLead}>
            <Select required value={teamLeadId} onChange={(e) => setTeamLeadId(e.target.value)}>
              <option value="">—</option>
              {teamLeads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name}
                </option>
              ))}
            </Select>
          </Field>
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
            <Button type="button" variant="secondary" onClick={() => setAdding(false)}>
              {he.button.cancel}
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" size="md" onClick={() => setAdding(true)} className="mt-3 w-fit">
          <Plus size={15} />
          {he.admin.addTeam}
        </Button>
      )}
    </Card>
  );
}
