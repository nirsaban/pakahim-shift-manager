import Link from 'next/link';
import { headers } from 'next/headers';
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
} from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { getDefaultTenantId } from '@/lib/db/tenant';
import { getNextShift } from '@/lib/services/shift-service';
import {
  getTeamStatus,
  getTeamsLedBy,
  getUpcomingRoster,
  getTeamLeadContact,
  type TeamMemberStatus,
  type RosterEntry,
} from '@/lib/services/team-service';
import { listIncidentsForUser } from '@/lib/services/incident-service';
import { getUploadHistory } from '@/lib/services/upload-service';
import { getAnalyticsSnapshot } from '@/lib/services/analytics-service';
import {
  getPendingRequestForShift,
  getSameTeamCandidates,
  getShiftsCoveringFor,
  listPendingCoverageRequests,
} from '@/lib/services/coverage-service';
import { formatWorkerName } from '@/lib/utils/display-name';
import { toWhatsAppLink } from '@/lib/utils/whatsapp';
import { he } from '@/lib/he';
import { Brand } from '../_components/Brand';
import { PageHeader } from '../_components/ui/PageHeader';
import { Card, CardHeader } from '../_components/ui/Card';
import { Badge } from '../_components/ui/Badge';
import { ShiftStatusPill, IncidentStatusPill, IncidentRoutePill } from '../_components/ui/StatusPill';
import { EmptyState } from '../_components/ui/EmptyState';
import { Button } from '../_components/ui/Button';
import { LogoutButton } from './_components/LogoutButton';
import { ReportIncidentForm } from './_components/ReportIncidentForm';
import { IncidentActions } from './_components/IncidentActions';
import { RequestCoverageForm } from './_components/RequestCoverageForm';
import { CoverageDecisionActions } from './_components/CoverageDecisionActions';
import { DirectAssignForm } from './_components/DirectAssignForm';

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
                {entry.startTime.toLocaleString('he-IL')} - {entry.endTime.toLocaleString('he-IL')}
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

export default async function DashboardPage() {
  const headersList = await headers();
  const userId = headersList.get('x-user-id') as string;
  const role = headersList.get('x-user-role') as string;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
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
          <LogoutButton />
        </div>
      </PageHeader>

      <div className="flex flex-col gap-6 pt-4">
        {role === 'TAKAHIM' && <TakahimDashboard userId={userId} teamId={user.teamId} />}
        {role === 'TEAM_LEAD' && <TeamLeadDashboard userId={userId} />}
        {role === 'MAINTENANCE' && <MaintenanceDashboard userId={userId} />}
        {(role === 'SHIBUTZ' || role === 'ADMIN' || role === 'SUPER_ADMIN') && <AdminDashboard />}
      </div>
    </main>
  );
}

async function TakahimDashboard({ userId, teamId }: { userId: string; teamId: string | null }) {
  const [next, members, teamLead, coveringFor] = await Promise.all([
    getNextShift(userId),
    teamId ? getTeamStatus(teamId) : Promise.resolve([]),
    teamId ? getTeamLeadContact(teamId) : Promise.resolve(null),
    getShiftsCoveringFor(userId),
  ]);

  const [pendingRequest, candidates] = next
    ? await Promise.all([
        getPendingRequestForShift(next.shift.id),
        teamId ? getSameTeamCandidates(teamId, userId) : Promise.resolve([]),
      ])
    : [null, []];

  return (
    <div className="flex flex-col gap-6">
      <Card className="brand-gradient relative overflow-hidden text-white">
        <div className="relative flex items-center gap-2 text-sm font-medium text-white/90">
          <Clock size={16} />
          {he.dashboard.myShift}
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
                {next.shift.startTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <ArrowLeftRight size={16} className="text-white/60" />
              <span className="text-3xl font-bold tabular-nums">
                {next.shift.endTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-sm text-white/75">
              {next.shift.startTime.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
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
            {next.shift.status !== 'SICK' && next.shift.status !== 'HOLIDAY' && (
              <div className="relative">
                <RequestCoverageForm
                  shiftId={next.shift.id}
                  candidates={candidates}
                  pending={pendingRequest ? { id: pendingRequest.id, reason: pendingRequest.reason } : null}
                />
              </div>
            )}
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
                  {s.startTime.toLocaleString('he-IL')} - {s.endTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <TeamStatusList members={members} />

      <ReportIncidentForm teamLeadPhone={teamLead?.phone} />
    </div>
  );
}

async function TeamLeadDashboard({ userId }: { userId: string }) {
  const teams = await getTeamsLedBy(userId);
  const teamIds = teams.map((t) => t.id);
  const [roster, members, incidents, pendingRequests] = await Promise.all([
    teamIds.length ? getUpcomingRoster(teamIds) : Promise.resolve([]),
    teamIds.length ? getTeamStatus(teamIds) : Promise.resolve([]),
    listIncidentsForUser(userId),
    teamIds.length ? listPendingCoverageRequests(teamIds) : Promise.resolve([]),
  ]);

  const candidatesByTeam = Object.fromEntries(
    await Promise.all(teamIds.map(async (id) => [id, await getSameTeamCandidates(id, userId)] as const)),
  );
  const shiftTeamById = Object.fromEntries(roster.map((r) => [r.shiftId, r.teamId]));

  return (
    <div className="flex flex-col gap-6">
      <RosterList entries={roster} showTeam={teams.length > 1} />

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
                {req.startTime.toLocaleString('he-IL')} -{' '}
                {req.endTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
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
              label: `${r.workerName} · ${r.startTime.toLocaleString('he-IL')}`,
            }))}
            candidatesByTeam={candidatesByTeam}
          />
        </Card>
      )}

      <TeamStatusList members={members} />

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
  const [uploads, analytics] = await Promise.all([getUploadHistory(tenantId), getAnalyticsSnapshot(tenantId)]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title={he.admin.adminPanel} icon={<UploadCloud size={16} />} />
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/upload">
            <Button size="lg">
              <UploadCloud size={17} />
              {he.admin.uploadSchedule}
            </Button>
          </Link>
          <Link href="/admin/manage">
            <Button size="lg" variant="secondary">
              <Users size={17} />
              {he.admin.manageTeams}
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

      <Card>
        <CardHeader title={he.admin.uploadHistory} icon={<History size={16} />} />
        <ul className="flex flex-col">
          {uploads.map((file) => (
            <li key={file.id} className="flex flex-col gap-1 border-t border-border py-3 first:border-0 first:pt-0">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-foreground">{file.filename}</span>
                <Badge tone={file.status === 'FAILED' ? 'danger' : 'success'}>
                  {uploadStatusLabel(file.status)}
                </Badge>
              </div>
              <div className="text-sm text-muted">
                {file.createdAt.toLocaleString('he-IL')}
                {file.status === 'IMPORTED' && ` · ${file.importedShiftCount} משמרות`}
                {file.errorMessage && ` · ${file.errorMessage}`}
              </div>
            </li>
          ))}
        </ul>
        {uploads.length === 0 && (
          <EmptyState icon={<History size={22} />}>{he.admin.noUploadsYet}</EmptyState>
        )}
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

function uploadStatusLabel(status: string): string {
  switch (status) {
    case 'IMPORTED':
      return 'יובא בהצלחה';
    case 'FAILED':
      return 'נכשל';
    default:
      return status;
  }
}
