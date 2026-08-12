'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { he } from '@/lib/he';
import { Button } from '../../_components/ui/Button';
import { Select } from '../../_components/ui/Field';

interface Candidate {
  id: string;
  name: string;
}

export function CoverageDecisionActions({
  requestId,
  proposedReplacementId,
  candidates,
}: {
  requestId: string;
  proposedReplacementId: string | null;
  candidates: Candidate[];
}) {
  const router = useRouter();
  const [replacementId, setReplacementId] = useState(proposedReplacementId ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function decide(decision: 'APPROVE' | 'REJECT') {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/coverage-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          decision === 'APPROVE' ? { decision, replacementId: replacementId || undefined } : { decision },
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? he.error.serverError);
        return;
      }
      router.refresh();
    } catch {
      setError(he.error.networkError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Select value={replacementId} onChange={(e) => setReplacementId(e.target.value)} className="text-sm">
        <option value="">{he.coverage.chooseReplacement}</option>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      {error && <p className="text-sm text-danger-fg">{error}</p>}
      <div className="flex gap-2">
        <Button size="md" disabled={loading || !replacementId} onClick={() => decide('APPROVE')} className="flex-1">
          <Check size={15} />
          {he.coverage.approve}
        </Button>
        <Button variant="secondary" size="md" disabled={loading} onClick={() => decide('REJECT')}>
          <X size={15} />
          {he.coverage.reject}
        </Button>
      </div>
    </div>
  );
}
