'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, X } from 'lucide-react';
import { he } from '@/lib/he';
import { Button } from '../../_components/ui/Button';

export function SwapSuggestionActions({
  suggestionId,
  canConvert,
}: {
  suggestionId: string;
  /** False when neither duty has a shift/worker to raise a coverage request against. */
  canConvert: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function act(body: Record<string, unknown>) {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/roster/swaps/${suggestionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
      {error && <p className="text-sm text-danger-fg">{error}</p>}
      <div className="flex gap-2">
        <Button
          size="md"
          className="flex-1"
          disabled={loading || !canConvert}
          onClick={() => act({ action: 'CONVERT', side: 'A' })}
        >
          <ArrowLeftRight size={15} />
          {he.roster.swaps.convert}
        </Button>
        <Button variant="secondary" size="md" disabled={loading} onClick={() => act({ action: 'DISMISS' })}>
          <X size={15} />
          {he.roster.swaps.dismiss}
        </Button>
      </div>
    </div>
  );
}
