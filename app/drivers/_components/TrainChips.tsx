import { TrainFront } from 'lucide-react';
import { he } from '@/lib/he';
import { taskSteps } from '@/lib/driver-roster/handoffs';

/**
 * A task's trains in time order: the ones driven, then - muted - the ones
 * only ridden as a passenger ("246 בת"), which are no part of the driving.
 * Falls back to the stored numbers when there is no task text to read.
 */
export function TrainChips({ task, fallback, size = 'md' }: { task: string | null; fallback: string[]; size?: 'sm' | 'md' }) {
  const steps = task ? taskSteps(task) : [];
  const trains = steps.flatMap((s) => (s.kind === 'train' ? [s] : []));
  const driven = trains.length > 0 ? [...new Set(trains.filter((s) => !s.passenger).map((s) => s.number))] : fallback;
  const ridden = [...new Set(trains.filter((s) => s.passenger).map((s) => s.number))].filter((n) => !driven.includes(n));
  if (driven.length === 0 && ridden.length === 0) return null;

  const chip = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-sm';
  return (
    <div className="flex flex-col gap-1.5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <TrainFront size={14} />
        {he.drivers.home.trains}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {driven.map((n) => (
          <span key={n} className={`rounded-full bg-surface-sunken font-medium text-foreground tabular-nums ${chip}`}>
            {n}
          </span>
        ))}
        {ridden.map((n) => (
          <span key={`p-${n}`} className={`rounded-full border border-dashed border-border text-muted tabular-nums ${chip}`}>
            {n} · {he.drivers.home.asPassenger}
          </span>
        ))}
      </div>
    </div>
  );
}
