import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  Clock,
  Users,
  UploadCloud,
  History,
  ArrowLeftRight,
  MessageCircle,
  MapPin,
  Sparkles,
  Wrench,
  ShieldCheck,
  CalendarOff,
  UserCog,
  BarChart3,
  UserCheck,
  Bell,
  Settings,
  Radar,
} from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { destroySession } from '@/lib/auth/session';
import { getDefaultTenantId } from '@/lib/db/tenant';
import {
  getTeamStatus,
  getTeamsLedBy,
  getUpcomingRoster,
  getTeamLeadContact,
  type TeamMemberStatus,
  type RosterEntry,
} from '@/lib/services/team-service';
import { listIncidentsForUser } from '@/lib/services/incident-service';
import {
  getHandoffPartnersForDuties,
  getWorkerSchedule,
  getWorkerShiftWindow,
} from '@/lib/services/worker-shift-service';
import { getTrainCompanions } from '@/lib/services/train-companion-service';
import {
  addIsraelDays,
  formatIsraelDate,
  formatIsraelDateTime,
  formatIsraelTime,
  startOfIsraelDay,
} from '@/lib/time/zone';
import { getTeamWorkload, getWorkerWorkload } from '@/lib/services/workload-service';
import {
  parseWorkloadRange,
  workloadWindowFor,
  type WorkloadRange,
} from '@/lib/roster/workload-range';
import { getAnalyticsSnapshot } from '@/lib/services/analytics-service';
import {
  getSameTeamCandidates,
  getShiftsCoveringFor,
  listPendingCoverageRequests,
} from '@/lib/services/coverage-service';
import {
  getActiveSuggestionDate,
  listSwapSuggestions,
} from '@/lib/services/swap-service';
import { formatWorkerName } from '@/lib/utils/display-name';
import { toWhatsAppLink } from '@/lib/utils/whatsapp';
import { he, swapKindLabel, swapRationaleMessage, transportLabel } from '@/lib/he';
import { Brand } from '../_components/Brand';
import { DataAccuracyNotice } from '../_components/DataAccuracyNotice';
import { PageHeader } from '../_components/ui/PageHeader';
import { Card, CardHeader } from '../_components/ui/Card';
import { Badge } from '../_components/ui/Badge';
import { ShiftStatusPill, IncidentStatusPill, IncidentRoutePill } from '../_components/ui/StatusPill';
import { EmptyState } from '../_components/ui/EmptyState';
import { Button } from '../_components/ui/Button';
import { LogoutButton } from './_components/LogoutButton';
import { ReportIncidentForm } from './_components/ReportIncidentForm';
import { IncidentActions } from './_components/IncidentActions';
import { CoverageDecisionActions } from './_components/CoverageDecisionActions';
import { DirectAssignForm } from './_components/DirectAssignForm';
import { SwapSuggestionActions } from './_components/SwapSuggestionActions';
import { ShiftDetail, ShiftSummary } from './_components/ShiftDetail';
import { TrainCompanions } from './_components/TrainCompanions';
import { MySchedule } from './_components/MySchedule';
import { TeamWorkloadCard, WorkloadCard } from './_components/WorkloadCard';
import { NotificationsPrompt } from './_components/NotificationsPrompt';
import { AlertSoundPlayer } from './_components/AlertSoundPlayer';
import { PushServiceStatus } from './_components/PushServiceStatus';

function StatTile({
  label,
  sublabel,
  value,
  icon,
}: {
  label: string;
  sublabel?: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[var(--radius-md)] bg-surface-sunken p-3.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
        {icon}
        {label}
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      {sublabel && <p className="text-xs text-muted">{sublabel}</p>}
    </div>
  );
}

function TeamStatusList({ members }: { members: TeamMemberStatus[] }) {
  return (
    <Card>
      <CardHeader title={he.dashboard.teamStatus} icon={<Users size={16} />} />
      <ul className="flex flex-col gap-1">
        {members.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] px-2 py-2 text-sm transition-colors hover:bg-surface-sunken"
          >
            <span className="font-medium text-foreground">{m.name}</span>
            <ShiftStatusPill status={m.status} />
          </li>
        ))}
      </ul>
      {members.length === 0 && <EmptyState icon={<Users size={22} />}>{he.dashboard.noUpcomingShifts}</EmptyState>}
    </Card>
  );
}

function RosterList({ entries, showTeam }: { entries: RosterEntry[]; showTeam: boolean }) {
  return (
    <Card>
      <CardHeader title={he.dashboard.upcomingRoster} icon={<History size={16} />} />
      <ul className="flex flex-col">
        {entries.map((entry, i) => (
          <li
            key={entry.shiftId}
            className="flex flex-col gap-1 border-t border-border py-3 first:border-0 first:pt-0"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">{entry.workerName}</span>
              {i === 0 && (
                <Badge tone="info" icon={<Sparkles size={12} />}>
                  {he.dashboard.nextUp}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
              <span>
                {formatIsraelDateTime(entry.startTime)} - {formatIsraelDateTime(entry.endTime)}
              </span>
              <span>&middot;</span>
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} />
                {entry.city ?? he.dashboard.locationUnknown}
              </span>
              {showTeam && (
                <>
                  <span>&middot;</span>
                  <span>{entry.teamName}</span>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {entries.length === 0 && <EmptyState icon={<History size={22} />}>{he.dashboard.noUpcomingShifts}</EmptyState>}
    </Card>
  );
}

/** `?load=week|month|year` — which span the workload cards are measured over. */
const WORKLOAD_RANGE_PARAM = 'load';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const workloadRange = parseWorkloadRange((await searchParams)[WORKLOAD_RANGE_PARAM]);
  const headersList = await headers();
  const userId = headersList.get('x-user-id') as string;
  const role = headersList.get('x-user-role') as string;
  const sessionId = headersList.get('x-session-id');

  // A live session can outlive its user: the account may have been deleted, or
  // the database reset, while the session was still valid in Redis. The
  // middleware only proves the session is live, not that the user still exists,
  // so throwing here would 500 the dashboard for someone holding a stale cookie.
  // Treat it as signed out and send them back to log in.
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    if (sessionId) await destroySession(sessionId);
    redirect('/login');
  }

  const displayName = formatWorkerName(user);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-10">
      <PageHeader>
        <Brand size="compact" />
        <div className="flex items-center gap-3">
          <div className="hidden text-end sm:block">
            <p className="text-xs text-muted">שלום,</p>
            <p className="text-sm font-semibold text-foreground">{displayName}</p>
          </div>
          <Link href="/settings" aria-label={he.settings.open} title={he.settings.open}>
            <Button variant="secondary" size="md">
              <Settings size={15} />
            </Button>
          </Link>
          <Link href="/install" aria-label={he.pwa.openInstallGuide} title={he.pwa.openInstallGuide}>
            <Button variant="secondary" size="md">
              <Bell size={15} />
            </Button>
          </Link>
          <LogoutButton />
        </div>
      </PageHeader>

      <div className="flex flex-col gap-6 pt-4">
        <DataAccuracyNotice />
        <NotificationsPrompt />
        {/* Renders nothing - listens for the service worker forwarding a push
            so the chosen tone can be played by a page that is actually open. */}
        <AlertSoundPlayer />

        {role === 'PAKAHIM' && (
          <PakahimDashboard userId={userId} teamId={user.teamId} workloadRange={workloadRange} />
        )}
        {role === 'TEAM_LEAD' && (
          <TeamLeadDashboard userId={userId} tenantId={user.tenantId} workloadRange={workloadRange} />
        )}
        {role === 'MAINTENANCE' && <MaintenanceDashboard userId={userId} />}
        {(role === 'SHIBUTZ' || role === 'ADMIN' || role === 'SUPER_ADMIN') && <AdminDashboard />}
      </div>
    </main>
  );
}

/**
 * A worker's own view: their previous, current and next shift with the parsed
 * detail behind each, and nothing about anyone else's roster.
 *
 * This deliberately no longer lists every member of the team. That is the
 * scheduler's view — noise on a phone, and it put the whole roster in front of
 * someone who needs to know when they start, where, and who they take the train
 * from. The people who ARE relevant (their replacement, and the inspectors
 * either side of them in the train's chain) are surfaced individually instead.
 */
/** How far ahead the "all my shifts" list looks - a fortnight covers any
 *  weekly workbook the scheduling department sends, with room to spare. */
const SCHEDULE_DAYS = 14;

/**
 * The list looks backwards as well as forwards. A worker asking about a shift
 * they already worked - which train, whose hand it went to - had nowhere to look
 * once it ended, and that is the question that comes up after the fact.
 */
const SCHEDULE_DAYS_BACK = 7;

async function PakahimDashboard({
  userId,
  teamId,
  workloadRange,
}: {
  userId: string;
  teamId: string | null;
  workloadRange: WorkloadRange;
}) {
  const today = startOfIsraelDay(new Date());
  const scheduleFrom = addIsraelDays(today, -SCHEDULE_DAYS_BACK);
  const scheduleTo = addIsraelDays(today, SCHEDULE_DAYS + 1);

  const [window, teamLead, coveringFor, schedule, workload] = await Promise.all([
    getWorkerShiftWindow(userId),
    teamId ? getTeamLeadContact(teamId) : Promise.resolve(null),
    getShiftsCoveringFor(userId),
    getWorkerSchedule(userId, { from: scheduleFrom, to: scheduleTo }),
    getWorkerWorkload(userId, teamId, workloadWindowFor(workloadRange)),
  ]);

  // The shift in progress is the one that matters now; otherwise the next one.
  const primaryShift = window.current ?? window.next;
  const secondaryShift = window.current ? window.next : null;

  const next = primaryShift
    ? {
        shift: primaryShift,
        replacement: primaryShift.replacement
          ? {
              name: formatWorkerName(primaryShift.replacement),
              city: primaryShift.replacement.city,
              phone: primaryShift.replacement.phone,
            }
          : null,
      }
    : null;

  // The three window shifts each open out to the same detail, so their handoffs
  // are fetched together rather than one lookup per card.
  const windowDutyIds = [window.current, window.next, window.previous]
    .map((s) => s?.duty?.id)
    .filter((id): id is string => Boolean(id));
  const [handoffsByDuty, trainCompanions] = await Promise.all([
    getHandoffPartnersForDuties(windowDutyIds),
    primaryShift?.duty ? getTrainCompanions(primaryShift.duty.id) : Promise.resolve([]),
  ]);

  const handoffsFor = (shift: typeof primaryShift) =>
    (shift?.duty && handoffsByDuty.get(shift.duty.id)) ?? { takesOverFrom: null, handsOverTo: null };
  const handoffs = handoffsFor(primaryShift);

  return (
    <div className="flex flex-col gap-6">
      <Card className="brand-gradient relative overflow-hidden text-white">
        <div className="relative flex items-center gap-2 text-sm font-medium text-white/90">
          <Clock size={16} />
          {window.current ? he.roster.myShift.inProgress : he.dashboard.myShift}
        </div>
        {next ? (
          <div className="relative mt-3 flex flex-col gap-3">
            {(next.shift.status === 'SICK' || next.shift.status === 'HOLIDAY') && (
              <Badge tone="warning" className="w-fit">
                {next.shift.status === 'SICK' ? he.dashboard.onSickLeave : he.dashboard.onHoliday}
              </Badge>
            )}
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums">
                {formatIsraelTime(next.shift.startTime)}
              </span>
              <ArrowLeftRight size={16} className="text-white/60" />
              <span className="text-3xl font-bold tabular-nums">
                {formatIsraelTime(next.shift.endTime)}
              </span>
            </div>
            <p className="text-sm text-white/75">
              {formatIsraelDate(next.shift.startTime)}
            </p>
            {next.replacement && (
              <div className="mt-1 flex flex-col gap-1.5 rounded-[var(--radius-md)] bg-white/10 p-3.5 ring-1 ring-white/15">
                <p className="text-xs font-medium uppercase tracking-wide text-white/60">
                  {he.dashboard.replacement}
                </p>
                <p className="font-semibold">{next.replacement.name}</p>
                <p className="flex items-center gap-1 text-sm text-white/75">
                  <MapPin size={13} />
                  {next.replacement.city ?? he.dashboard.locationUnknown}
                </p>
                {(() => {
                  const link = toWhatsAppLink(next.replacement.phone);
                  return link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex w-fit items-center gap-1.5 rounded-[var(--radius-md)] bg-[#25D366] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                    >
                      <MessageCircle size={15} />
                      {he.dashboard.contactViaWhatsapp}
                    </a>
                  ) : null;
                })()}
              </div>
            )}
            {/* The worker-initiated "אני לא יכול/ה להגיע למשמרת" request was removed
                at the client's request: coverage is arranged by phone with the
                ראש צוות, who then records it here. The approval flow and direct
                assignment are untouched - only the worker's entry point is gone. */}
          </div>
        ) : (
          <p className="relative mt-3 text-sm text-white/75">{he.dashboard.noUpcomingShifts}</p>
        )}
      </Card>

      {coveringFor.length > 0 && (
        <Card>
          <CardHeader title={he.dashboard.coveringForTitle} icon={<ShieldCheck size={16} />} />
          <ul className="flex flex-col">
            {coveringFor.map((s) => (
              <li key={s.shiftId} className="flex flex-col gap-1 border-t border-border py-3 first:border-0 first:pt-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">
                    {he.dashboard.coveringForSubtitle} {s.workerName}
                  </span>
                </div>
                <span className="text-sm text-muted">
                  {formatIsraelDateTime(s.startTime)} - {formatIsraelTime(s.endTime)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ShiftDetail
        duty={primaryShift?.duty ?? null}
        takesOverFrom={handoffs.takesOverFrom}
        handsOverTo={handoffs.handsOverTo}
      />

      <TrainCompanions trains={trainCompanions} />

      {secondaryShift && (
        <ShiftSummary
          title={he.roster.myShift.next}
          shift={secondaryShift}
          handoffs={handoffsFor(secondaryShift)}
        />
      )}

      <MySchedule entries={schedule} days={SCHEDULE_DAYS} />

      <WorkloadCard workload={workload} range={workloadRange} />

      <ShiftSummary
        title={he.roster.myShift.previous}
        shift={window.previous}
        tone="muted"
        handoffs={handoffsFor(window.previous)}
      />

      <ReportIncidentForm teamLeadPhone={teamLead?.phone} />
    </div>
  );
}

function minutesLabel(minutes: number | null): string {
  if (minutes === null) return '--:--';
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Swap suggestions for the active roster date.
 *
 * ABSORB_HANDOFF entries appear even when no home stations are known — they are
 * structural evidence (two inspectors dead-heading in opposite directions
 * through the same station), so the panel is useful before onboarding fills the
 * home-station data in. The banner says so rather than showing an empty list.
 */
async function SwapSuggestionsPanel({ tenantId }: { tenantId: string }) {
  const date = await getActiveSuggestionDate(tenantId);
  const suggestions = date ? await listSwapSuggestions({ tenantId, date, limit: 20 }) : [];

  const anyUnverified = suggestions.some(
    (s) => s.rationale?.code === 'DEADHEAD_CROSSING_UNVERIFIED',
  );

  return (
    <Card>
      <CardHeader title={he.roster.swaps.title} icon={<ArrowLeftRight size={16} />} />
      <p className="text-sm text-muted">{he.roster.swaps.subtitle}</p>
      {date && (
        <p className="mt-1 text-sm text-muted">
          {formatIsraelDate(date, { weekday: 'long', day: '2-digit', month: '2-digit' })}
        </p>
      )}

      {anyUnverified && (
        <p className="mt-3 rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning-fg">
          {he.roster.swaps.needsHomeStations}
        </p>
      )}

      <ul className="mt-3 flex flex-col gap-3">
        {suggestions.map((s) => (
          <li key={s.id} className="flex flex-col gap-2 border-t border-border py-3 first:border-0 first:pt-0">
            <div className="flex items-center justify-between gap-3">
              <Badge tone="info">{swapKindLabel(s.kind)}</Badge>
              {s.savedMinutes > 0 && (
                <span className="text-sm font-medium text-foreground">
                  {he.roster.swaps.saved} {s.savedMinutes} {he.roster.swaps.minutes}
                </span>
              )}
            </div>

            <p className="text-sm text-muted">{swapRationaleMessage(s.rationale?.code ?? '')}</p>

            {s.handoff && (
              <p className="text-sm text-muted">
                {he.roster.handoffs.train} {s.handoff.trainNumber}
                {s.stationNames.handoff ? ` · ${he.roster.handoffs.at} ${s.stationNames.handoff}` : ''}
                {` · ${he.roster.handoffs.gap} ${s.handoff.gapMinutes} ${he.roster.handoffs.minutes}`}
              </p>
            )}

            <div className="flex flex-col gap-1 text-sm">
              <span className="text-foreground">
                {he.roster.handoffs.from}: {s.dutyA.workerName || he.roster.duty.openDuty} (#{s.dutyA.serial})
                {' · '}
                {he.roster.swaps.endsAt} {s.stationNames.endA ?? '—'} {minutesLabel(s.dutyA.endMinutes)}
                {' · '}
                <span className="text-muted">
                  {he.roster.swaps.leavesBy}: {transportLabel(s.dutyA.endTransport)}
                </span>
              </span>
              <span className="text-foreground">
                {he.roster.handoffs.to}: {s.dutyB.workerName || he.roster.duty.openDuty} (#{s.dutyB.serial})
                {' · '}
                {he.roster.swaps.startsAt} {s.stationNames.startB ?? '—'} {minutesLabel(s.dutyB.startMinutes)}
                {' · '}
                <span className="text-muted">
                  {he.roster.swaps.arrivesBy}: {transportLabel(s.dutyB.startTransport)}
                </span>
              </span>
              {(s.evidence?.homeA || s.evidence?.homeB) && (
                <span className="text-muted">
                  {he.roster.swaps.home} {s.evidence.homeA ?? he.roster.swaps.homeUnknown}
                  {' / '}
                  {s.evidence.homeB ?? he.roster.swaps.homeUnknown}
                </span>
              )}
              {/* Rail minutes are the inspector's own time; taxi minutes are a
                  railway cost. Kept apart so a scheduler sees which is which. */}
              {s.evidence?.railMinutesSaved > 0 && (
                <span className="text-muted">
                  {he.roster.swaps.savedRail}: {s.evidence.railMinutesSaved} {he.roster.handoffs.minutes}
                </span>
              )}
              {s.evidence?.taxiMinutesSaved > 0 && (
                <span className="text-muted">
                  {he.roster.swaps.savedTaxi}: {s.evidence.taxiMinutesSaved} {he.roster.handoffs.minutes}
                </span>
              )}
            </div>

            <SwapSuggestionActions
              suggestionId={s.id}
              canConvert={Boolean(s.dutyA.shiftId && s.workerBId)}
            />
          </li>
        ))}
      </ul>

      {suggestions.length === 0 && (
        <EmptyState icon={<ArrowLeftRight size={22} />}>{he.roster.swaps.empty}</EmptyState>
      )}
    </Card>
  );
}

async function TeamLeadDashboard({
  userId,
  tenantId,
  workloadRange,
}: {
  userId: string;
  tenantId: string;
  workloadRange: WorkloadRange;
}) {
  const teams = await getTeamsLedBy(userId);
  const teamIds = teams.map((t) => t.id);
  const workloadWindow = workloadWindowFor(workloadRange);
  const [roster, members, incidents, pendingRequests, teamWorkload] = await Promise.all([
    teamIds.length ? getUpcomingRoster(teamIds) : Promise.resolve([]),
    teamIds.length ? getTeamStatus(teamIds) : Promise.resolve([]),
    listIncidentsForUser(userId),
    teamIds.length ? listPendingCoverageRequests(teamIds) : Promise.resolve([]),
    teamIds.length
      ? getTeamWorkload(teamIds, workloadWindow)
      : Promise.resolve({ window: workloadWindow, members: [], averageMinutes: null }),
  ]);

  const candidatesByTeam = Object.fromEntries(
    await Promise.all(teamIds.map(async (id) => [id, await getSameTeamCandidates(id, userId)] as const)),
  );
  const shiftTeamById = Object.fromEntries(roster.map((r) => [r.shiftId, r.teamId]));

  return (
    <div className="flex flex-col gap-6">
      <RosterList entries={roster} showTeam={teams.length > 1} />

      <SwapSuggestionsPanel tenantId={tenantId} />

      <Card>
        <CardHeader title={he.coverage.approvalsTitle} icon={<CalendarOff size={16} />} />
        <ul className="flex flex-col gap-3">
          {pendingRequests.map((req) => (
            <li key={req.id} className="flex flex-col gap-2 border-t border-border py-3 first:border-0 first:pt-0">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-foreground">
                  {he.coverage.requestedBy} {req.requesterName}
                </span>
                <Badge tone="warning">{reasonLabel(req.reason)}</Badge>
              </div>
              <span className="text-sm text-muted">
                {formatIsraelDateTime(req.startTime)} -{' '}
                {formatIsraelTime(req.endTime)}
              </span>
              {req.note && <p className="text-sm text-muted">{req.note}</p>}
              <CoverageDecisionActions
                requestId={req.id}
                proposedReplacementId={req.proposedReplacementId}
                candidates={candidatesByTeam[shiftTeamById[req.shiftId]] ?? []}
              />
            </li>
          ))}
        </ul>
        {pendingRequests.length === 0 && (
          <EmptyState icon={<CalendarOff size={22} />}>{he.coverage.noPendingRequests}</EmptyState>
        )}
      </Card>

      {roster.length > 0 && (
        <Card>
          <CardHeader title={he.coverage.directAssignTitle} icon={<UserCog size={16} />} />
          <DirectAssignForm
            shifts={roster.map((r) => ({
              id: r.shiftId,
              teamId: r.teamId,
              label: `${r.workerName} · ${formatIsraelDateTime(r.startTime)}`,
            }))}
            candidatesByTeam={candidatesByTeam}
          />
        </Card>
      )}

      <TeamStatusList members={members} />

      <TeamWorkloadCard
        members={teamWorkload.members}
        averageMinutes={teamWorkload.averageMinutes}
        window={teamWorkload.window}
        range={workloadRange}
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
        {incidents.length === 0 && (
          <EmptyState icon={<Sparkles size={22} />}>{he.teamLead.noOpenIncidents}</EmptyState>
        )}
      </Card>
    </div>
  );
}

async function MaintenanceDashboard({ userId }: { userId: string }) {
  const incidents = await listIncidentsForUser(userId);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title={he.maintenance.dashboardTitle} icon={<Wrench size={16} />} />
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
              <p className="text-xs text-muted">{formatWorkerName(incident.worker)}</p>
              <IncidentActions incidentId={incident.id} status={incident.status} />
            </li>
          ))}
        </ul>
        {incidents.length === 0 && (
          <EmptyState icon={<Wrench size={22} />}>{he.maintenance.noOpenIncidents}</EmptyState>
        )}
      </Card>
    </div>
  );
}

async function AdminDashboard() {
  const tenantId = await getDefaultTenantId();
  const analytics = await getAnalyticsSnapshot(tenantId);

  return (
    <div className="flex flex-col gap-6">
      <PushServiceStatus tenantId={tenantId} />

      {/* Swap suggestions are a team-lead tool, not an admin one - they act on
          one team's roster, and an admin has no standing to convert them. The
          panel stays on the TEAM_LEAD dashboard. Upload history moved to its own
          page (/admin/uploads), where each file can name the dates it wrote. */}

      <Card>
        <CardHeader title={he.admin.adminPanel} icon={<UploadCloud size={16} />} />
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/upload">
            <Button size="lg">
              <UploadCloud size={17} />
              {he.admin.uploadSchedule}
            </Button>
          </Link>
          <Link href="/admin/uploads">
            <Button size="lg" variant="secondary">
              <History size={17} />
              {he.admin.uploadHistory}
            </Button>
          </Link>
          <Link href="/admin/timezone">
            <Button size="lg" variant="secondary">
              <Clock size={17} />
              {he.timezone.title}
            </Button>
          </Link>
          <Link href="/admin/commander">
            <Button size="lg" variant="secondary">
              <Radar size={17} />
              {he.commander.title}
            </Button>
          </Link>
          <Link href="/admin/manage">
            <Button size="lg" variant="secondary">
              <Users size={17} />
              {he.admin.manageTeams}
            </Button>
          </Link>
          <Link href="/admin/whatsapp">
            <Button size="lg" variant="secondary">
              <MessageCircle size={17} />
              {he.whatsapp.title}
            </Button>
          </Link>
        </div>
      </Card>

      <Card>
        <CardHeader title={he.admin.analyticsTitle} icon={<BarChart3 size={16} />} />
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
            label={he.admin.pendingCoverageRequestsTenantWide}
            value={String(analytics.pendingCoverageRequestCount)}
            icon={<CalendarOff size={16} />}
          />
          <StatTile
            label={he.admin.incidentSummary}
            value={`${analytics.incidentsByStatus.open} / ${analytics.incidentsByStatus.acknowledged} / ${analytics.incidentsByStatus.resolved}`}
            sublabel="פתוח / התקבל / סגור"
            icon={<Sparkles size={16} />}
          />
        </div>
      </Card>

    </div>
  );
}

function reasonLabel(reason: string): string {
  switch (reason) {
    case 'SICK':
      return he.coverage.reasonSick;
    case 'HOLIDAY':
      return he.coverage.reasonHoliday;
    case 'SWAP':
      return he.coverage.reasonSwap;
    default:
      return he.coverage.reasonOther;
  }
}
