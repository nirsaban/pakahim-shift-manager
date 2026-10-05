'use client';

import { he } from '@/lib/he';
import type { Workforce } from '@/lib/auth/workforce';

const WORKFORCES: Workforce[] = ['pakahim', 'drivers'];

/**
 * פקח / נהג קטר, chosen before anything else on the login page: the two log in
 * differently (worker number vs phone) and against different rosters.
 * Styled as the dashboard's workload range tabs.
 */
export function WorkforcePicker({ value, onChange }: { value: Workforce; onChange: (w: Workforce) => void }) {
  return (
    <div
      role="radiogroup"
      className="flex w-full max-w-sm items-center gap-0.5 rounded-[var(--radius-md)] bg-surface-sunken p-0.5"
    >
      {WORKFORCES.map((workforce) => {
        const active = workforce === value;
        return (
          <button
            key={workforce}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(workforce)}
            className={
              active
                ? 'flex-1 rounded-full bg-surface-raised px-3 py-2 text-sm font-semibold text-foreground shadow-[var(--shadow-card)]'
                : 'flex-1 rounded-full px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground'
            }
          >
            {he.drivers.workforce[workforce]}
          </button>
        );
      })}
    </div>
  );
}
