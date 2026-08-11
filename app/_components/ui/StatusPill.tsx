import { CircleCheck, Palmtree, ThermometerSun, CircleDashed, Wrench, Siren } from 'lucide-react';
import { Badge } from './Badge';
import { he } from '@/lib/he';

export function ShiftStatusPill({ status }: { status: string | null }) {
  switch (status) {
    case 'SCHEDULED':
    case 'STARTED':
      return (
        <Badge tone="success" icon={<CircleCheck size={13} />}>
          {he.dashboard.onShift}
        </Badge>
      );
    case 'HOLIDAY':
      return (
        <Badge tone="info" icon={<Palmtree size={13} />}>
          {he.dashboard.onHoliday}
        </Badge>
      );
    case 'SICK':
      return (
        <Badge tone="warning" icon={<ThermometerSun size={13} />}>
          {he.dashboard.onSickLeave}
        </Badge>
      );
    default:
      return (
        <Badge tone="neutral" icon={<CircleDashed size={13} />}>
          {he.dashboard.offline}
        </Badge>
      );
  }
}

export function IncidentStatusPill({ status }: { status: string }) {
  switch (status) {
    case 'OPEN':
      return <Badge tone="danger">{he.incident.statusOpen}</Badge>;
    case 'ACKNOWLEDGED':
      return <Badge tone="warning">{he.incident.statusAcknowledged}</Badge>;
    case 'RESOLVED':
      return <Badge tone="success">{he.incident.statusResolved}</Badge>;
    default:
      return <Badge tone="neutral">{status}</Badge>;
  }
}

// Only flags the two non-default routes - a plain TEAM_LEAD-routed incident needs no badge.
export function IncidentRoutePill({ route }: { route: string }) {
  switch (route) {
    case 'MAINTENANCE':
      return (
        <Badge tone="info" icon={<Wrench size={12} />}>
          {he.incident.routeMaintenanceBadge}
        </Badge>
      );
    case 'EMERGENCY_BROADCAST':
      return (
        <Badge tone="danger" icon={<Siren size={12} />}>
          {he.incident.routeEmergencyBadge}
        </Badge>
      );
    default:
      return null;
  }
}
