'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleCheck, TriangleAlert, Wrench } from 'lucide-react';
import { he } from '@/lib/he';
import { Button } from '../../../_components/ui/Button';

interface RepairResult {
  shiftsRepaired: number;
  dutiesRepaired: number;
  uploadRecordsRepaired: number;
  staleRemindersCleared: number;
  after: { shiftsNeedingRepair: number };
}

/**
 * Runs the repair and reports exactly what moved.
 *
 * It also runs automatically on every container boot, so this is the manual
 * handle for the case that matters: an admin looking at wrong hours right now
 * who should not have to wait for a deploy or find someone with a shell.
 */
export function RepairButton({ pending }: { pending: number }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RepairResult | null>(null);
  const [error, setError] = useState('');

  async function run() {
    setRunning(true);
    setError('');
    try {
      const res = await fetch('/api/admin/timezone', { method: 'POST' });
      if (!res.ok) {
        setError(he.error.serverError);
        return;
      }
      setResult(await res.json());
      router.refresh();
    } catch {
      setError(he.error.networkError);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button size="lg" onClick={run} disabled={running || pending === 0} className="w-fit">
        <Wrench size={17} />
        {running ? he.timezone.repairing : he.timezone.repairAction(pending)}
      </Button>

      {error && (
        <p className="flex items-center gap-1.5 text-sm text-danger-fg">
          <TriangleAlert size={14} className="shrink-0" />
          {error}
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-1 rounded-[var(--radius-md)] bg-success-bg p-3.5 text-sm text-success-fg">
          <p className="flex items-center gap-1.5 font-medium">
            <CircleCheck size={15} className="shrink-0" />
            {he.timezone.repairDone}
          </p>
          <p>{he.timezone.repairedShifts(result.shiftsRepaired)}</p>
          <p>{he.timezone.repairedDuties(result.dutiesRepaired)}</p>
          <p>{he.timezone.clearedReminders(result.staleRemindersCleared)}</p>
          <p>{he.timezone.remaining(result.after.shiftsNeedingRepair)}</p>
        </div>
      )}
    </div>
  );
}
