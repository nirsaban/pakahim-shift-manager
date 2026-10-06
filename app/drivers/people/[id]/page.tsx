import { CalendarDays } from 'lucide-react';
import { requireDriver } from '@/lib/auth/driver-page';
import { getDriver, getShiftsOf, scheduleWindow } from '@/lib/services/driver-views-service';
import { he } from '@/lib/he';
import { Card, CardHeader } from '../../../_components/ui/Card';
import { Badge } from '../../../_components/ui/Badge';
import { EmptyState } from '../../../_components/ui/EmptyState';
import { DriverHeader } from '../../_components/DriverHeader';
import { ContactButtons, RowLink, shiftHref } from '../../_components/links';
import { ShiftRowBody } from '../../_components/shift-bits';

/** A driver: how to reach them, and their shifts - each opening its page. */
export default async function DriverPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireDriver();
  const id = (await params).id;
  const person = await getDriver(user.tenantId, id);
  const t = he.drivers.personPage;

  if (!person) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6">
        <DriverHeader back />
        <Card className="mt-4">
          <EmptyState>{t.notFound}</EmptyState>
        </Card>
      </main>
    );
  }

  const now = new Date();
  const { from, to } = scheduleWindow(now);
  const shifts = await getShiftsOf(user.tenantId, id, from, to);
  const upcoming = shifts.filter((s) => s.endTime > now);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6">
      <DriverHeader back />
      <div className="flex flex-col gap-4 pt-4">
        <Card>
          <div className="flex flex-col gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{person.name}</h1>
              <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted">
                {person.city && (
                  <span>
                    {t.city}: {person.city}
                  </span>
                )}
                {person.workerNumber && (
                  <span>
                    {t.workerNumber}: {person.workerNumber}
                  </span>
                )}
              </p>
              {!person.registered && <Badge tone="neutral" className="mt-2">{t.notRegistered}</Badge>}
            </div>
            {id !== user.id && <ContactButtons phone={person.phone} name={person.name} />}
          </div>
        </Card>

        <Card className="p-0">
          <div className="px-5 pt-5">
            <CardHeader title={t.shifts} icon={<CalendarDays size={16} />} />
          </div>
          {upcoming.length === 0 ? (
            <EmptyState>{t.noShifts}</EmptyState>
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((s) => (
                <li key={s.id}>
                  <RowLink href={shiftHref(s.id)}>
                    <ShiftRowBody shift={s} now={now} title={s.originStation ?? he.drivers.shiftPage.title} detail={s.link} />
                  </RowLink>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </main>
  );
}
