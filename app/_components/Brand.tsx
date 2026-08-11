import { TrainFront } from 'lucide-react';
import { he } from '@/lib/he';

export function Brand({ size = 'full' }: { size?: 'full' | 'compact' }) {
  if (size === 'compact') {
    return (
      <div className="flex items-center gap-2.5">
        <span className="brand-gradient flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-white shadow-[var(--shadow-card)]">
          <TrainFront size={18} />
        </span>
        <span className="font-bold text-foreground">{he.brand.name}</span>
      </div>
    );
  }

  return (
    <div className="brand-gradient flex flex-col items-center gap-3 rounded-[var(--radius-xl)] px-6 py-7 text-white shadow-[var(--shadow-card-hover)]">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
        <TrainFront size={30} />
      </span>
      <div className="text-center">
        <h1 className="text-xl font-bold">{he.brand.name}</h1>
        <p className="text-sm text-white/80">{he.brand.appName}</p>
      </div>
    </div>
  );
}
