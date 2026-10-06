import type { ReactNode } from 'react';
import { History, MapPin, Sparkles, Users } from 'lucide-react';
import { he } from '@/lib/he';
import { formatIsraelDateTime } from '@/lib/time/zone';
import type { RosterEntry, TeamMemberStatus } from '@/lib/services/team-service';
import { Card, CardHeader } from '../../_components/ui/Card';
import { Badge } from '../../_components/ui/Badge';
import { ShiftStatusPill } from '../../_components/ui/StatusPill';
import { EmptyState } from '../../_components/ui/EmptyState';

// Team panels shared by the פקחים team-lead dashboard and the drivers' admin
// page. Moved here unchanged from app/dashboard/page.tsx.

export function StatTile({
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

export function TeamStatusList({ members }: { members: TeamMemberStatus[] }) {
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

export function RosterList({ entries, showTeam }: { entries: RosterEntry[]; showTeam: boolean }) {
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
