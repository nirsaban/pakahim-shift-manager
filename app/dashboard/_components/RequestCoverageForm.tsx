'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarOff, CircleCheck, X } from 'lucide-react';
import { he } from '@/lib/he';
import { Card, CardHeader } from '../../_components/ui/Card';
import { Button } from '../../_components/ui/Button';
import { Field, Select, Textarea } from '../../_components/ui/Field';

const REASONS = [
  { value: 'SICK', label: he.coverage.reasonSick },
  { value: 'HOLIDAY', label: he.coverage.reasonHoliday },
  { value: 'SWAP', label: he.coverage.reasonSwap },
  { value: 'OTHER', label: he.coverage.reasonOther },
];

interface Candidate {
  id: string;
  name: string;
}

interface PendingRequest {
  id: string;
  reason: string;
}

export function RequestCoverageForm({
  shiftId,
  candidates,
  pending,
}: {
  shiftId: string;
  candidates: Candidate[];
  pending: PendingRequest | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('SICK');
  const [note, setNote] = useState('');
  const [proposedReplacementId, setProposedReplacementId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/coverage-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId,
          reason,
          note: note || undefined,
          proposedReplacementId: proposedReplacementId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? he.error.serverError);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError(he.error.networkError);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!pending) return;
    setLoading(true);
    try {
      await fetch(`/api/coverage-requests/${pending.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'CANCEL' }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (pending) {
    return (
      <div className="mt-1 flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-white/10 p-3 ring-1 ring-white/15">
        <div className="flex items-center gap-2 text-sm text-white/85">
          <CircleCheck size={15} />
          {he.dashboard.coverageRequestPending}
        </div>
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="text-xs font-medium text-white/70 underline-offset-2 hover:text-white hover:underline"
        >
          {he.dashboard.cancelCoverageRequest}
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <Button
        variant="secondary"
        size="md"
        onClick={() => setOpen(true)}
        className="mt-1 w-fit bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20"
      >
        <CalendarOff size={15} />
        {he.dashboard.requestCoverage}
      </Button>
    );
  }

  return (
    <Card className="mt-1">
      <CardHeader title={he.coverage.requestTitle} icon={<CalendarOff size={16} />} />
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <Field label={he.coverage.reason}>
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
        {reason === 'OTHER' && (
          <Field label={he.coverage.note}>
            <Textarea required value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </Field>
        )}
        {candidates.length > 0 && (
          <Field label={he.coverage.proposeReplacement}>
            <Select value={proposedReplacementId} onChange={(e) => setProposedReplacementId(e.target.value)}>
              <option value="">{he.coverage.noProposal}</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {error && <p className="text-sm text-danger-fg">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={loading} className="flex-1">
            {he.coverage.submitRequest}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            <X size={15} />
            {he.button.cancel}
          </Button>
        </div>
      </form>
    </Card>
  );
}
