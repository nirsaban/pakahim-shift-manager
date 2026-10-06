import { requireDriver } from '@/lib/auth/driver-page';
import { getShiftsOf, scheduleWindow } from '@/lib/services/driver-views-service';
import { getWorkerWorkload } from '@/lib/services/workload-service';
import { parseWorkloadRange, workloadWindowFor } from '@/lib/roster/workload-range';
import { he } from '@/lib/he';
import { Card } from '../../_components/ui/Card';
import { EmptyState } from '../../_components/ui/EmptyState';
import { WorkloadCard } from '../../dashboard/_components/WorkloadCard';
import { DriverHeader } from '../_components/DriverHeader';
import { RowLink, shiftHref } from '../_components/links';
import { ShiftRowBody } from '../_components/shift-bits';

/** The driver's own shifts - coming and recent - each opening its page, and their workload. */
export default async function MyDriverShiftsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireDriver();
  const now = new Date();
  const { from, to } = scheduleWindow(now);
  const range = parseWorkloadRange((await searchParams).load);
  const [shifts, workload] = await Promise.all([
    getShiftsOf(user.tenantId, user.id, from, to),
    getWorkerWorkload(user.id, user.teamId, workloadWindowFor(range)),
  ]);
  const upcoming = shifts.filter((s) => s.endTime > now);
  const past = shifts.filter((s) => s.endTime <= now).reverse();
  const t = he.drivers.shiftsPage;

  const list = (items: typeof shifts) => (
    <Card className="p-0">
      <ul className="divide-y divide-border">
        {items.map((s) => (
          <li key={s.id}>
            <RowLink href={shiftHref(s.id)}>
              <ShiftRowBody
                shift={s}
                now={now}
                title={s.originStation ?? he.drivers.shiftPage.title}
                detail={[s.link, s.replacementName && `${he.drivers.shiftPage.coveredBy}: ${s.replacementName}`].filter(Boolean).join(' · ')}
              />
            </RowLink>
          </li>
        ))}
      </ul>
    </Card>
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6">
      <DriverHeader />
      <div className="flex flex-col gap-4 pt-4">
        <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted">{t.upcoming}</h2>
          {upcoming.length > 0 ? list(upcoming) : <Card><EmptyState>{t.none}</EmptyState></Card>}
        </section>

        <WorkloadCard workload={workload} range={range} basePath="/drivers/shifts" />

        {past.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted">{t.past}</h2>
            {list(past)}
          </section>
        )}
      </div>
    </main>
  );
}
