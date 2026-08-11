'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, CheckCheck } from 'lucide-react';
import { he } from '@/lib/he';
import { Button } from '../../_components/ui/Button';

export function IncidentActions({ incidentId, status }: { incidentId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function update(next: 'ACKNOWLEDGED' | 'RESOLVED') {
    setLoading(true);
    try {
      await fetch(`/api/notifications/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (status === 'RESOLVED') return null;

  return (
    <div className="flex gap-2">
      {status === 'OPEN' && (
        <Button variant="secondary" size="md" disabled={loading} onClick={() => update('ACKNOWLEDGED')}>
          <Check size={15} />
          {he.teamLead.acknowledgeIncident}
        </Button>
      )}
      <Button size="md" disabled={loading} onClick={() => update('RESOLVED')}>
        <CheckCheck size={15} />
        {he.teamLead.resolveIncident}
      </Button>
    </div>
  );
}
