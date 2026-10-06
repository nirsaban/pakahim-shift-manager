import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { destroySession } from '@/lib/auth/session';
import { isDriversAdmin } from '@/lib/auth/roles';
import { formatWorkerName } from '@/lib/utils/display-name';
import { addIsraelDays, formatIsraelDateTime, formatIsraelTime, startOfIsraelDay } from '@/lib/time/zone';
import { relativeDayLabel } from '@/lib/driver-roster/display';
import { parseWorkloadRange, workloadWindowFor } from '@/lib/roster/workload-range';
import {
  getDriverDirectory,
  getTrainPartners,
  getUpcomingDriverShifts,
} from '@/lib/services/driver-home-service';
import { getWorkerSchedule } from '@/lib/services/worker-shift-service';
import { getWorkerWorkload } from '@/lib/services/workload-service';
import { getShiftsCoveringFor } from '@/lib/services/coverage-service';
import { getTeamLeadContact } from '@/lib/services/team-service';
import { he } from '@/lib/he';
import { DataAccuracyNotice } from '../_components/DataAccuracyNotice';
import { Card, CardHeader } from '../_components/ui/Card';
import { NotificationsPrompt } from '../dashboard/_components/NotificationsPrompt';
import { AlertSoundPlayer } from '../dashboard/_components/AlertSoundPlayer';
import { MySchedule } from '../dashboard/_components/MySchedule';
import { WorkloadCard } from '../dashboard/_components/WorkloadCard';
import { ReportIncidentForm } from '../dashboard/_components/ReportIncidentForm';
import { DriverHeader } from './_components/DriverHeader';
import { DriverAdminNav } from './_components/DriverAdminNav';
import { MyShifts } from './_components/MyShifts';
import { TrainPartners } from './_components/TrainPartners';
import { DriverDirectory, type DirectoryRow } from './_components/DriverDirectory';

// Same spans as the פקחים dashboard's schedule card.
const SCHEDULE_DAYS = 14;
const SCHEDULE_DAYS_BACK = 7;

/**
 * Home for a locomotive driver - only a driver session reaches it (proxy.ts).
 * Everything a פקח's dashboard has that applies to drivers: the next shift
 * and who covers it, shifts they cover, the drivers on their trains, their
 * schedule and workload, and incident reports to their team lead; then the
 * day's roster with everyone's contact details. The roster admin also gets
 * his tools here.
 */
export default async function DriversHomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const headersList = await headers();
  const userId = headersList.get('x-user-id') as string;
  const sessionId = headersList.get('x-session-id');

  // The session can outlive its user (account removed, database reset); treat
  // that as signed out rather than failing the render.
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== 'DRIVER') {
    if (sessionId) await destroySession(sessionId);
    redirect('/login');
  }

  const workloadRange = parseWorkloadRange((await searchParams).load);
  const now = new Date();
  const today = startOfIsraelDay(now);

  const [shifts, directory, schedule, workload, coveringFor, teamLead] = await Promise.all([
    getUpcomingDriverShifts(user.id, now),
    getDriverDirectory(user.tenantId, now),
    getWorkerSchedule(user.id, { from: addIsraelDays(today, -SCHEDULE_DAYS_BACK), to: addIsraelDays(today, SCHEDULE_DAYS + 1) }),
    getWorkerWorkload(user.id, user.teamId, workloadWindowFor(workloadRange)),
    getShiftsCoveringFor(user.id),
    user.teamId ? getTeamLeadContact(user.teamId) : Promise.resolve(null),
  ]);
  const next = shifts[0];
  const trains = next ? await getTrainPartners(next, user.tenantId) : [];

  // Times are formatted here, in Israel time, so the client never reads them
  // in the phone's own zone.
  const rows: DirectoryRow[] = directory.entries.map((e) => ({
    id: e.id,
    name: e.name,
    workerNumber: e.workerNumber,
    phone: e.phone,
    city: e.city,
    shift: e.shift
      ? { span: `${formatIsraelTime(e.shift.startTime)}–${formatIsraelTime(e.shift.endTime)}`, origin: e.shift.originStation }
      : null,
  }));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-10">
      <DriverHeader />

      <div className="flex flex-col gap-6 pt-4">
        <h1 className="text-2xl font-bold text-foreground">
          {he.drivers.home.greeting}, {formatWorkerName(user)}
        </h1>

        <DataAccuracyNotice />
        <NotificationsPrompt />
        {/* Renders nothing - plays the reminder tone a push brings in. */}
        <AlertSoundPlayer />

        {isDriversAdmin(user) && <DriverAdminNav />}

        <MyShifts shifts={shifts} now={now} />

        {coveringFor.length > 0 && (
          <Card>
            <CardHeader title={he.dashboard.coveringForTitle} icon={<ShieldCheck size={16} />} />
            <ul className="flex flex-col">
              {coveringFor.map((s) => (
                <li key={s.shiftId} className="flex flex-col gap-1 border-t border-border py-3 first:border-0 first:pt-0">
                  <span className="font-medium text-foreground">
                    {he.dashboard.coveringForSubtitle} {s.workerName}
                  </span>
                  <span className="text-sm text-muted">
                    {formatIsraelDateTime(s.startTime)} - {formatIsraelTime(s.endTime)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <TrainPartners trains={trains} />

        <MySchedule entries={schedule} days={SCHEDULE_DAYS} />

        <WorkloadCard workload={workload} range={workloadRange} basePath="/drivers" />

        <ReportIncidentForm teamLeadPhone={teamLead?.phone} />

        <DriverDirectory dayLabel={directory.day ? relativeDayLabel(directory.day, now) : null} rows={rows} />
      </div>
    </main>
  );
}
