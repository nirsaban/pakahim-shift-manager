import Link from 'next/link';
import { he } from '@/lib/he';
import { WORKLOAD_RANGES, type WorkloadRange } from '@/lib/roster/workload-range';

/**
 * Week / month / year tabs for a workload card.
 *
 * Plain links rather than client state: the numbers are computed on the server
 * from a prisma query, so a tab has to reach the server either way. Written into
 * the query string, the chosen range also survives a refresh and can be shared
 * or bookmarked. `scroll={false}` keeps the page where it was — the card is far
 * down the dashboard and a scroll to the top would lose it.
 */
export function WorkloadRangeTabs({
  active,
  param = 'load',
}: {
  active: WorkloadRange;
  param?: string;
}) {
  return (
    <nav
      aria-label={he.workload.rangeLabel}
      className="flex items-center gap-0.5 rounded-[var(--radius-md)] bg-surface-sunken p-0.5"
    >
      {WORKLOAD_RANGES.map((range) => {
        const isActive = range === active;
        return (
          <Link
            key={range}
            href={`/dashboard?${param}=${range}`}
            scroll={false}
            aria-current={isActive ? 'page' : undefined}
            className={
              isActive
                ? 'rounded-full bg-surface-raised px-2.5 py-1 text-xs font-semibold text-foreground shadow-[var(--shadow-card)]'
                : 'rounded-full px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:text-foreground'
            }
          >
            {he.workload.ranges[range]}
          </Link>
        );
      })}
    </nav>
  );
}
