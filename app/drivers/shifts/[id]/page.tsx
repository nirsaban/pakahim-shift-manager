import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpLeft, CalendarDays, Radio, Route, UserRound } from 'lucide-react';
import { requireDriver } from '@/lib/auth/driver-page';
import { dayParam, getShiftDetail, type HandoffRef } from '@/lib/services/driver-views-service';
import { relativeDayLabel } from '@/lib/driver-roster/display';
import { formatIsraelDate } from '@/lib/time/zone';
import { he } from '@/lib/he';
import { Card, CardHeader } from '../../../_components/ui/Card';
import { EmptyState } from '../../../_components/ui/EmptyState';
import { DriverHeader } from '../../_components/DriverHeader';
import { ContactButtons, PersonLink, RowLink, StationLink, TrainLink, rosterHref, shiftHref } from '../../_components/links';
import { SourceBadge, StatusBadge, StepTimeline, span } from '../../_components/shift-bits';

/** One shift - anyone's in the drivers' tenant - with everything known about it. */
export default async function DriverShiftPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireDriver();
  const shift = await getShiftDetail(user.tenantId, (await params).id);
  const t = he.drivers.shiftPage;

  if (!shift) {
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
  const day = dayParam(shift.date);
  const mine = shift.worker.id === user.id;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6">
      <DriverHeader back />

      <div className="flex flex-col gap-5 pt-4">
        <Card className="brand-gradient text-white">
          <div className="flex items-center justify-between gap-2 text-sm text-white/85">
            <Link href={rosterHref(day)} className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline">
              <CalendarDays size={15} />
              {relativeDayLabel(shift.date, now)} · {formatIsraelDate(shift.date, { day: 'numeric', month: 'numeric' })}
            </Link>
            <span className="flex gap-1">
              <StatusBadge status={shift.status} />
              <SourceBadge source={shift.source} />
            </span>
          </div>
          <p className="mt-2 text-4xl font-bold tabular-nums" dir="ltr">
            {span(shift)}
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-white/70">{mine ? t.mine : t.driver}</p>
              <Link href={`/drivers/people/${shift.worker.id}`} className="text-lg font-semibold underline-offset-2 hover:underline">
                {shift.worker.name}
              </Link>
            </div>
            {!mine && <ContactButtons phone={shift.worker.phone} name={shift.worker.name} compact />}
          </div>
        </Card>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Fact label={he.drivers.home.origin}>
            {shift.originStation ? <StationLink name={shift.originStation} day={day} className="font-semibold" /> : '—'}
          </Fact>
          <Fact label={he.drivers.home.mirs} icon={<Radio size={13} />}>
            {shift.mirs ?? '—'}
          </Fact>
          {shift.link && <Fact label={t.linkLabel}>{shift.link}</Fact>}
          {shift.serial !== null && <Fact label={t.rowLabel}>{shift.serial}</Fact>}
          {shift.source && <Fact label={t.sourceLabel}>{t.sourceValue[shift.source]}</Fact>}
        </dl>

        {shift.replacement && (
          <Card>
            <CardHeader title={t.coveredBy} icon={<UserRound size={16} />} />
            <div className="flex items-center justify-between gap-3">
              <PersonLink id={shift.replacement.id}>{shift.replacement.name}</PersonLink>
              <ContactButtons phone={shift.replacement.phone} name={shift.replacement.name} compact />
            </div>
          </Card>
        )}

        {shift.companion && (
          <Card>
            <CardHeader title={shift.companion.role} icon={<UserRound size={16} />} />
            <p className="text-sm text-foreground">
              {shift.companion.name}
              {shift.companion.workerNumber && ` (${shift.companion.workerNumber})`}
              {shift.companion.mirs && ` · ${he.drivers.home.companionMirs(shift.companion.mirs)}`}
            </p>
          </Card>
        )}

        <Card className="p-0">
          <div className="px-5 pt-5">
            <CardHeader title={he.drivers.handoffs.title} icon={<ArrowLeftRight size={16} />} />
          </div>
          <HandoffGroup
            title={mine ? he.drivers.handoffs.takesOverFrom : he.drivers.handoffs.theyTakeOverFrom}
            icon={<ArrowDownLeft size={14} />}
            refs={shift.takesOverFrom}
            day={day}
          />
          <HandoffGroup
            title={mine ? he.drivers.handoffs.handsOverTo : he.drivers.handoffs.theyHandOverTo}
            icon={<ArrowUpLeft size={14} />}
            refs={shift.handsOverTo}
            day={day}
          />
          {shift.takesOverFrom.length === 0 && shift.handsOverTo.length === 0 && (
            <p className="px-5 pb-5 text-sm text-muted">{he.drivers.handoffs.none}</p>
          )}
          <p className="px-5 pb-4 text-xs text-muted">{he.drivers.handoffs.note}</p>
        </Card>

        <Card>
          <CardHeader title={t.timeline} icon={<Route size={16} />} />
          <StepTimeline steps={shift.steps} day={day} />
        </Card>
      </div>
    </main>
  );
}

function Fact({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-surface-sunken px-3 py-2">
      <dt className="flex items-center gap-1.5 text-xs text-muted">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 font-semibold text-foreground">{children}</dd>
    </div>
  );
}

/** One direction of handoffs: each row opens the other driver's shift; train and station have their own links. */
function HandoffGroup({ title, icon, refs, day }: { title: string; icon: ReactNode; refs: HandoffRef[]; day: string }) {
  if (refs.length === 0) return null;
  return (
    <div className="pb-2">
      <p className="flex items-center gap-1.5 px-5 pb-1 text-xs font-medium text-muted">
        {icon}
        {title}
      </p>
      <ul className="divide-y divide-border">
        {refs.map((h) => (
          <li key={`${h.shiftId}-${h.trainNumber}`} className="flex items-center gap-2 pe-4">
            <RowLink href={shiftHref(h.shiftId)} className="flex-1 pe-1">
              <p className="font-medium text-foreground">{h.person.name}</p>
              <p className="text-xs text-muted tabular-nums" dir="ltr">
                {span(h)}
              </p>
            </RowLink>
            <TrainLink number={h.trainNumber} day={day} size="sm" />
            {h.station && <StationLink name={h.station} day={day} className="text-xs text-muted" />}
          </li>
        ))}
      </ul>
    </div>
  );
}
