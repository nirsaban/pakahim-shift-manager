import { ArrowLeftRight, MapPin, PlayCircle } from 'lucide-react';
import { requireDriver } from '@/lib/auth/driver-page';
import { dayParam, defaultDay, getPublishedDays, getStationDay, parseDayParam } from '@/lib/services/driver-views-service';
import { he } from '@/lib/he';
import { Card, CardHeader } from '../../../_components/ui/Card';
import { EmptyState } from '../../../_components/ui/EmptyState';
import { DriverHeader } from '../../_components/DriverHeader';
import { DayContext } from '../../_components/DayContext';
import { RowLink, TrainLink, shiftHref } from '../../_components/links';
import { span } from '../../_components/shift-bits';

/** One station on one day: who starts there, and which trains change hands there. */
export default async function DriverStationPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireDriver();
  const name = decodeURIComponent((await params).name);
  const now = new Date();
  const day = parseDayParam((await searchParams).day) ?? defaultDay(await getPublishedDays(user.tenantId), now);
  const t = he.drivers.stationPage;
  const station = day ? await getStationDay(user.tenantId, day, name) : { starting: [], handoffs: [] };
  const dayKey = day ? dayParam(day) : '';

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6">
      <DriverHeader back />
      <div className="flex flex-col gap-4 pt-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <MapPin size={22} />
            {t.title(name)}
          </h1>
          {day && <DayContext day={day} now={now} />}
        </div>

        {station.starting.length === 0 && station.handoffs.length === 0 && (
          <Card>
            <EmptyState>{t.none}</EmptyState>
          </Card>
        )}

        {station.handoffs.length > 0 && (
          <Card className="p-0">
            <div className="px-5 pt-5">
              <CardHeader title={t.handoffs} icon={<ArrowLeftRight size={16} />} />
            </div>
            <ul className="divide-y divide-border">
              {station.handoffs.map((h) => (
                <li key={`${h.to.id}-${h.train}`} className="flex items-center gap-2 pe-4">
                  <RowLink href={shiftHref(h.to.id)} className="flex-1">
                    <p className="text-sm text-foreground">
                      {h.from.person.name} ← {h.to.worker.name}
                    </p>
                    <p className="text-xs text-muted tabular-nums" dir="ltr">
                      {span(h.from)} / {span(h.to)}
                    </p>
                  </RowLink>
                  <TrainLink number={h.train} day={dayKey} size="sm" />
                </li>
              ))}
            </ul>
          </Card>
        )}

        {station.starting.length > 0 && (
          <Card className="p-0">
            <div className="px-5 pt-5">
              <CardHeader title={t.starting} icon={<PlayCircle size={16} />} />
            </div>
            <ul className="divide-y divide-border">
              {station.starting.map((s) => (
                <li key={s.id}>
                  <RowLink href={shiftHref(s.id)}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate font-medium text-foreground">{s.worker.name}</span>
                      <span className="shrink-0 text-sm text-foreground tabular-nums" dir="ltr">
                        {span(s)}
                      </span>
                    </div>
                  </RowLink>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </main>
  );
}
