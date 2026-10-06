import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { BarChart3, CalendarOff, ShieldCheck, Sparkles, UserCheck, UserCog } from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { findRosterAdmin } from '@/lib/auth/roster-admin';
import { formatIsraelDateTime } from '@/lib/time/zone';
import { parseWorkloadRange, workloadWindowFor } from '@/lib/roster/workload-range';
import { getTeamStatus, getUpcomingRoster } from '@/lib/services/team-service';
import { getTeamWorkload } from '@/lib/services/workload-service';
import { listIncidentsForUser } from '@/lib/services/incident-service';
import { getSameTeamCandidates } from '@/lib/services/coverage-service';
import { getAnalyticsSnapshot } from '@/lib/services/analytics-service';
import { he } from '@/lib/he';
import { Card, CardHeader } from '../../_components/ui/Card';
import { EmptyState } from '../../_components/ui/EmptyState';
import { IncidentRoutePill, IncidentStatusPill } from '../../_components/ui/StatusPill';
import { RosterList, StatTile, TeamStatusList } from '../../dashboard/_components/TeamPanels';
import { TeamWorkloadCard } from '../../dashboard/_components/WorkloadCard';
import { DirectAssignForm } from '../../dashboard/_components/DirectAssignForm';
import { IncidentActions } from '../../dashboard/_components/IncidentActions';
import { DriverHeader } from '../_components/DriverHeader';

/** How far ahead the replacement picker reaches: the published day and the next. */
const ASSIGN_HORIZON_MS = 48 * 60 * 60 * 1000;

/**
 * The roster admin's team view - what the פקחים team lead and admin see,
 * scoped to the drivers: who works next, assigning a replacement, today's
 * status, team workload, incident reports and the headline numbers.
 */
export default async function DriversTeamPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await findRosterAdmin((await headers()).get('x-user-id'));
  if (!admin) redirect('/drivers');

  const workloadRange = parseWorkloadRange((await searchParams).load);
  const teams = await prisma.team.findMany({ where: { tenantId: admin.tenantId } });
  const teamIds = teams.map((t) => t.id);

  const [upcoming, members, workload, incidents, analytics] = await Promise.all([
    getUpcomingRoster(teamIds, 500),
    getTeamStatus(teamIds),
    getTeamWorkload(teamIds, workloadWindowFor(workloadRange)),
    listIncidentsForUser(admin.id),
    getAnalyticsSnapshot(admin.tenantId),
  ]);
  // The admin is a driver too and may cover a shift himself, so nobody is left out.
  const candidatesByTeam = Object.fromEntries(
    await Promise.all(teamIds.map(async (id) => [id, await getSameTeamCandidates(id, '')] as const)),
  );

  const horizon = new Date().getTime() + ASSIGN_HORIZON_MS;
  const assignable = upcoming.filter((r) => r.startTime.getTime() < horizon);
  // Everyone has a status row; only today's roster - on shift, sick, on leave - is news.
  const today = members.filter((m) => m.status !== null);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-10">
      <DriverHeader back />

      <div className="flex flex-col gap-6 pt-4">
        <h1 className="text-2xl font-bold text-foreground">{he.drivers.admin.team}</h1>

        <RosterList entries={upcoming.slice(0, 10)} showTeam={teams.length > 1} />

        {assignable.length > 0 && (
          <Card>
            <CardHeader title={he.coverage.directAssignTitle} icon={<UserCog size={16} />} />
            <DirectAssignForm
              shifts={assignable.map((r) => ({
                id: r.shiftId,
                teamId: r.teamId,
                label: `${r.workerName} · ${formatIsraelDateTime(r.startTime)}`,
              }))}
              candidatesByTeam={candidatesByTeam}
            />
          </Card>
        )}

        <TeamWorkloadCard
          members={workload.members}
          averageMinutes={workload.averageMinutes}
          window={workload.window}
          range={workloadRange}
          basePath="/drivers/team"
        />

        <Card>
          <CardHeader title={he.teamLead.incidents} icon={<Sparkles size={16} />} />
          <ul className="flex flex-col">
            {incidents.map((incident) => (
              <li key={incident.id} className="flex flex-col gap-2 border-t border-border py-3 first:border-0 first:pt-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-foreground">{incident.title}</span>
                  <div className="flex items-center gap-1.5">
                    <IncidentRoutePill route={incident.route} />
                    <IncidentStatusPill status={incident.status} />
                  </div>
                </div>
                <p className="text-sm text-muted">{incident.description}</p>
                <IncidentActions incidentId={incident.id} status={incident.status} />
              </li>
            ))}
          </ul>
          {incidents.length === 0 && <EmptyState icon={<Sparkles size={22} />}>{he.teamLead.noOpenIncidents}</EmptyState>}
        </Card>

        <Card>
          <CardHeader title={he.drivers.admin.stats} icon={<BarChart3 size={16} />} />
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              label={he.admin.coverageRate}
              sublabel={he.admin.coverageRateSubtitle}
              value={
                analytics.coverageRatePercent === null
                  ? '—'
                  : `${analytics.coverageRatePercent}% (${analytics.coveredShiftCount}/${analytics.needsCoverageShiftCount})`
              }
              icon={<ShieldCheck size={16} />}
            />
            <StatTile
              label={he.admin.registrationCompletion}
              sublabel={he.admin.registrationCompletionSubtitle}
              value={
                analytics.registrationCompletionPercent === null
                  ? '—'
                  : `${analytics.registrationCompletionPercent}% (${analytics.registeredWorkerCount}/${analytics.totalWorkerCount})`
              }
              icon={<UserCheck size={16} />}
            />
            <StatTile
              label={he.admin.incidentSummary}
              value={`${analytics.incidentsByStatus.open} / ${analytics.incidentsByStatus.acknowledged} / ${analytics.incidentsByStatus.resolved}`}
              sublabel="פתוח / התקבל / סגור"
              icon={<Sparkles size={16} />}
            />
            <StatTile
              label={he.drivers.admin.shiftsToday(today.length)}
              value={String(today.filter((m) => m.status === 'SICK' || m.status === 'HOLIDAY').length)}
              sublabel={`${he.dashboard.onSickLeave} / ${he.dashboard.onHoliday}`}
              icon={<CalendarOff size={16} />}
            />
          </div>
        </Card>
        {/* Last: with the whole day's roster it is the longest list on the page. */}
        {today.length > 0 ? (
          <TeamStatusList members={today} />
        ) : (
          <Card>
            <CardHeader title={he.drivers.admin.teamStatusToday} icon={<UserCheck size={16} />} />
            <EmptyState>{he.drivers.admin.teamStatusEmpty}</EmptyState>
          </Card>
        )}

      </div>
    </main>
  );
}
