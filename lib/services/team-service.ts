import { prisma } from '../db/prisma';
import { formatWorkerName } from '../utils/display-name';

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export interface TeamMemberStatus {
  id: string;
  name: string;
  status: string | null;
}

// A team lead can lead more than one team (e.g. one per region imported from
// a roster file), so callers must fan queries out across all of them.
export async function getTeamsLedBy(teamLeadId: string) {
  return prisma.team.findMany({ where: { teamLeadId } });
}

export async function getTeamStatus(teamId: string | string[]): Promise<TeamMemberStatus[]> {
  const { start, end } = todayRange();
  const teamFilter = Array.isArray(teamId) ? { in: teamId } : teamId;

  const [members, shifts] = await Promise.all([
    prisma.user.findMany({ where: { teamId: teamFilter }, orderBy: { firstName: 'asc' } }),
    prisma.shift.findMany({ where: { teamId: teamFilter, date: { gte: start, lte: end } } }),
  ]);

  const shiftByWorker = new Map(shifts.map((s) => [s.workerId, s]));

  return members.map((member) => ({
    id: member.id,
    name: formatWorkerName(member),
    status: shiftByWorker.get(member.id)?.status ?? null,
  }));
}

export interface RosterEntry {
  shiftId: string;
  workerName: string;
  workerNumber: string | null;
  city: string | null;
  startTime: Date;
  endTime: Date;
  teamName: string;
}

export async function getUpcomingRoster(teamId: string | string[], limit = 10): Promise<RosterEntry[]> {
  const teamFilter = Array.isArray(teamId) ? { in: teamId } : teamId;
  const shifts = await prisma.shift.findMany({
    where: { teamId: teamFilter, endTime: { gte: new Date() }, status: { in: ['SCHEDULED', 'STARTED'] } },
    orderBy: { startTime: 'asc' },
    take: limit,
    include: { worker: true, team: true },
  });

  return shifts.map((shift) => ({
    shiftId: shift.id,
    workerName: formatWorkerName(shift.worker),
    workerNumber: shift.worker.workerNumber,
    city: shift.worker.city,
    startTime: shift.startTime,
    endTime: shift.endTime,
    teamName: shift.team.name,
  }));
}

export interface TeamLeadContact {
  name: string;
  phone: string | null;
}

export async function getTeamLeadContact(teamId: string): Promise<TeamLeadContact | null> {
  const team = await prisma.team.findUnique({ where: { id: teamId }, include: { teamLead: true } });
  if (!team) return null;
  return { name: formatWorkerName(team.teamLead), phone: team.teamLead.phone };
}

export async function getUpcomingRosterForTenant(tenantId: string, limit = 20): Promise<RosterEntry[]> {
  const shifts = await prisma.shift.findMany({
    where: { tenantId, endTime: { gte: new Date() }, status: { in: ['SCHEDULED', 'STARTED'] } },
    orderBy: { startTime: 'asc' },
    take: limit,
    include: { worker: true, team: true },
  });

  return shifts.map((shift) => ({
    shiftId: shift.id,
    workerName: formatWorkerName(shift.worker),
    workerNumber: shift.worker.workerNumber,
    city: shift.worker.city,
    startTime: shift.startTime,
    endTime: shift.endTime,
    teamName: shift.team.name,
  }));
}
