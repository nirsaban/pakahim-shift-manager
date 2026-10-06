import { Footprints, TrainFront } from 'lucide-react';
import { requireDriver } from '@/lib/auth/driver-page';
import { dayParam, defaultDay, getPublishedDays, getTrainDay, parseDayParam } from '@/lib/services/driver-views-service';
import { he } from '@/lib/he';
import { Card, CardHeader } from '../../../_components/ui/Card';
import { EmptyState } from '../../../_components/ui/EmptyState';
import { DriverHeader } from '../../_components/DriverHeader';
import { DayContext } from '../../_components/DayContext';
import { RowLink, shiftHref } from '../../_components/links';
import { FromTo, span } from '../../_components/shift-bits';

/** One train on one day: who drives it, in order and where it changes hands, and who rides it. */
export default async function DriverTrainPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireDriver();
  const number = decodeURIComponent((await params).number);
  const now = new Date();
  const day = parseDayParam((await searchParams).day) ?? defaultDay(await getPublishedDays(user.tenantId), now);
  const t = he.drivers.trainPage;
  const legs = day ? await getTrainDay(user.tenantId, day, number) : [];
  const drivers = legs.filter((l) => !l.passenger);
  const riders = legs.filter((l) => l.passenger);
  const dayKey = day ? dayParam(day) : '';

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6">
      <DriverHeader back />
      <div className="flex flex-col gap-4 pt-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <TrainFront size={22} />
            {t.title(number)}
          </h1>
          {day && <DayContext day={day} now={now} />}
        </div>

        {legs.length === 0 ? (
          <Card>
            <EmptyState>{t.none}</EmptyState>
          </Card>
        ) : (
          <>
            <Card className="p-0">
              <div className="px-5 pt-5">
                <CardHeader title={t.drivers} icon={<TrainFront size={16} />} />
              </div>
              <ol className="divide-y divide-border">
                {drivers.map((l) => {
                  const from = l.shift.takesOverFrom.find((h) => h.trainNumber === number);
                  return (
                    <li key={l.shift.id} className={l.shift.worker.id === user.id ? 'bg-primary-500/5' : undefined}>
                      <RowLink href={shiftHref(l.shift.id)}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{l.shift.worker.name}</p>
                            <FromTo from={l.from} to={l.to} day={dayKey} />
                            {from && <p className="text-xs text-muted">{t.takesOver(from.person.name, from.station)}</p>}
                          </div>
                          <span className="shrink-0 text-sm text-foreground tabular-nums" dir="ltr">
                            {span(l.shift)}
                          </span>
                        </div>
                      </RowLink>
                    </li>
                  );
                })}
              </ol>
            </Card>

            {riders.length > 0 && (
              <Card className="p-0">
                <div className="px-5 pt-5">
                  <CardHeader title={t.passengers} icon={<Footprints size={16} />} />
                </div>
                <ul className="divide-y divide-border">
                  {riders.map((l) => (
                    <li key={l.shift.id}>
                      <RowLink href={shiftHref(l.shift.id)}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{l.shift.worker.name}</p>
                            <FromTo from={l.from} to={l.to} day={dayKey} />
                          </div>
                          <span className="shrink-0 text-sm text-muted tabular-nums" dir="ltr">
                            {span(l.shift)}
                          </span>
                        </div>
                      </RowLink>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </div>
    </main>
  );
}
