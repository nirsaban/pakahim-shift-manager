import Link from 'next/link';
import { headers } from 'next/headers';
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
  const [next, members, teamLead] = await Promise.all([
    getNextShift(userId),
    teamId ? getTeamStatus(teamId) : Promise.resolve([]),
    teamId ? getTeamLeadContact(teamId) : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Card className="brand-gradient relative overflow-hidden text-white">
        <div className="relative flex items-center gap-2 text-sm font-medium text-white/90">
          <Clock size={16} />
          {he.dashboard.myShift}
        </div>
        {next ? (
          <div className="relative mt-3 flex flex-col gap-3">
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
          </div>
        ) : (
          <p className="relative mt-3 text-sm text-white/75">{he.dashboard.noUpcomingShifts}</p>
        )}
      </Card>

      <TeamStatusList members={members} />

      <ReportIncidentForm teamLeadPhone={teamLead?.phone} />
    </div>
  );
}

async function TeamLeadDashboard({ userId }: { userId: string }) {
  const teams = await getTeamsLedBy(userId);
  const teamIds = teams.map((t) => t.id);
  const [roster, members, incidents] = await Promise.all([
    teamIds.length ? getUpcomingRoster(teamIds) : Promise.resolve([]),
    teamIds.length ? getTeamStatus(teamIds) : Promise.resolve([]),
    listIncidentsForUser(userId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <RosterList entries={roster} showTeam={teams.length > 1} />

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
  const uploads = await getUploadHistory(tenantId);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title={he.admin.adminPanel} icon={<UploadCloud size={16} />} />
        <Link href="/admin/upload">
          <Button size="lg">
            <UploadCloud size={17} />
            {he.admin.uploadSchedule}
          </Button>
        </Link>
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
