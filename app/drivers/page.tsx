import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlertTriangle, CalendarDays, CalendarRange, ChevronLeft, ShieldCheck, TrainFront, Users } from 'lucide-react';
import { requireDriver } from '@/lib/auth/driver-page';
import { isDriversAdmin } from '@/lib/auth/roles';
import { formatWorkerName } from '@/lib/utils/display-name';
import { addIsraelDays, formatIsraelDateTime, formatIsraelTime, startOfIsraelDay } from '@/lib/time/zone';
import { getUpcomingDriverShifts } from '@/lib/services/driver-home-service';
import { dayParam, defaultDay, getPublishedDays, getShiftDetail, getShiftsOf } from '@/lib/services/driver-views-service';
import { getShiftsCoveringFor } from '@/lib/services/coverage-service';
import { he } from '@/lib/he';
import { DataAccuracyNotice } from '../_components/DataAccuracyNotice';
import { Card, CardHeader } from '../_components/ui/Card';
import { EmptyState } from '../_components/ui/EmptyState';
import { NotificationsPrompt } from '../dashboard/_components/NotificationsPrompt';
import { AlertSoundPlayer } from '../dashboard/_components/AlertSoundPlayer';
import { DriverHeader } from './_components/DriverHeader';
import { DriverAdminNav } from './_components/DriverAdminNav';
import { NextShiftCard } from './_components/NextShiftCard';
import { RowLink, rosterHref, shiftHref } from './_components/links';
import { ShiftRowBody } from './_components/shift-bits';

/**
 * A driver's home: the next shift at a glance, and a way into everything
 * else - their shifts, the day's roster, the drivers, a fault report. Each of
 * those is a page of its own (and a tab at the bottom).
 */
export default async function DriversHomePage() {
  const user = await requireDriver();
  const now = new Date();
  const today = startOfIsraelDay(now);

  const [upcoming, days, week, coveringFor] = await Promise.all([
    getUpcomingDriverShifts(user.id, now, 1),
    getPublishedDays(user.tenantId),
    getShiftsOf(user.tenantId, user.id, today, addIsraelDays(today, 7)),
    getShiftsCoveringFor(user.id),
  ]);
  const next = upcoming[0] ? await getShiftDetail(user.tenantId, upcoming[0].id) : null;
  const rosterDay = defaultDay(days, now);
  const rosterCount = days.find((d) => d.date.getTime() === rosterDay?.getTime())?.shiftCount ?? 0;
  const q = he.drivers.quick;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6">
      <DriverHeader />

      <div className="flex flex-col gap-5 pt-4">
        <h1 className="text-2xl font-bold text-foreground">
          {he.drivers.home.greeting}, {formatWorkerName(user)}
        </h1>

        <DataAccuracyNotice />
        <NotificationsPrompt />
        {/* Renders nothing - plays the reminder tone a push brings in. */}
        <AlertSoundPlayer />

        <NextShiftCard shift={next} now={now} />

        {/* The week ahead, a weekly upload's days included - each opening its shift. */}
        <Card className="p-0">
          <div className="px-5 pt-5">
            <CardHeader
              title={he.drivers.shiftsPage.myWeek}
              icon={<CalendarRange size={16} />}
              action={
                <Link href="/drivers/shifts" className="inline-flex items-center text-sm font-medium text-primary-600 hover:underline">
                  {he.drivers.shiftsPage.all}
                  <ChevronLeft size={16} />
                </Link>
              }
            />
          </div>
          {week.length === 0 ? (
            <EmptyState>{he.drivers.shiftsPage.noneThisWeek}</EmptyState>
          ) : (
            <ul className="divide-y divide-border">
              {week.map((s) => (
                <li key={s.id} className={s.endTime <= now ? 'opacity-60' : undefined}>
                  <RowLink href={shiftHref(s.id)}>
                    <ShiftRowBody shift={s} now={now} title={s.originStation ?? he.drivers.shiftPage.title} detail={s.link} />
                  </RowLink>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Tile href="/drivers/shifts" icon={<CalendarDays size={20} />} title={q.myShifts} detail={he.drivers.shiftsPage.thisWeek(week.length)} />
          <Tile
            href={rosterDay ? rosterHref(dayParam(rosterDay)) : '/drivers/roster'}
            icon={<TrainFront size={20} />}
            title={q.todayRoster}
            detail={he.drivers.rosterPage.count(rosterCount)}
          />
          <Tile href="/drivers/people" icon={<Users size={20} />} title={he.drivers.nav.people} />
          <Tile href="/drivers/report" icon={<AlertTriangle size={20} />} title={q.report} />
        </div>

        {coveringFor.length > 0 && (
          <Card className="p-0">
            <div className="px-5 pt-5">
              <CardHeader title={he.dashboard.coveringForTitle} icon={<ShieldCheck size={16} />} />
            </div>
            <ul className="divide-y divide-border">
              {coveringFor.map((s) => (
                <li key={s.shiftId}>
                  <RowLink href={shiftHref(s.shiftId)}>
                    <p className="font-medium text-foreground">
                      {he.dashboard.coveringForSubtitle} {s.workerName}
                    </p>
                    <p className="text-sm text-muted">
                      {formatIsraelDateTime(s.startTime)} - {formatIsraelTime(s.endTime)}
                    </p>
                  </RowLink>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {isDriversAdmin(user) && <DriverAdminNav />}
      </div>
    </main>
  );
}

function Tile({ href, icon, title, detail }: { href: string; icon: ReactNode; title: string; detail?: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-border bg-surface-raised p-4 shadow-[var(--shadow-card)] transition-colors hover:border-primary-500 active:bg-surface-sunken"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500/10 text-primary-600">{icon}</span>
      <span className="font-semibold text-foreground">{title}</span>
      {detail && <span className="text-xs text-muted">{detail}</span>}
    </Link>
  );
}
