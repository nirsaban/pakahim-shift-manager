'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCog } from 'lucide-react';
import { he } from '@/lib/he';
import { Button } from '../../_components/ui/Button';
import { Field, Select } from '../../_components/ui/Field';

interface ShiftOption {
  id: string;
  label: string;
  teamId: string;
}

interface Candidate {
  id: string;
  name: string;
}

export function DirectAssignForm({
  shifts,
  candidatesByTeam,
}: {
  shifts: ShiftOption[];
  candidatesByTeam: Record<string, Candidate[]>;
}) {
  const router = useRouter();
  const [shiftId, setShiftId] = useState(shifts[0]?.id ?? '');
  const [replacementId, setReplacementId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const selectedShift = shifts.find((s) => s.id === shiftId);
  const candidates = useMemo(
    () => (selectedShift ? candidatesByTeam[selectedShift.teamId] ?? [] : []),
    [selectedShift, candidatesByTeam],
  );

  async function handleAssign() {
    if (!shiftId || !replacementId) return;
    setError('');
    setLoading(true);
    setDone(false);
    try {
      const res = await fetch(`/api/shifts/${shiftId}/replacement`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replacementId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? he.error.serverError);
        return;
      }
      setDone(true);
      setReplacementId('');
      router.refresh();
    } catch {
      setError(he.error.networkError);
    } finally {
      setLoading(false);
    }
  }

  if (shifts.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <Field label={he.coverage.directAssignSubtitle}>
        <Select
          value={shiftId}
          onChange={(e) => {
            setShiftId(e.target.value);
            setReplacementId('');
            setDone(false);
          }}
        >
          {shifts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={he.coverage.chooseReplacement}>
        <Select value={replacementId} onChange={(e) => setReplacementId(e.target.value)}>
          <option value="">{he.coverage.chooseReplacement}</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      {error && <p className="text-sm text-danger-fg">{error}</p>}
      {done && <p className="text-sm text-success-fg">{he.coverage.replacementAssigned}</p>}
      <Button size="md" disabled={loading || !replacementId} onClick={handleAssign} className="w-fit">
        <UserCog size={15} />
        {he.coverage.assign}
      </Button>
    </div>
  );
}
