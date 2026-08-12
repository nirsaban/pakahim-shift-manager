import { prisma } from '../db/prisma';
import { formatWorkerName } from '../utils/display-name';
import type { CreateTeamInput, CreateWorkerInput, UpdateTeamInput, UpdateWorkerInput } from '../validation/admin';

export type AdminResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };
const ok = <T>(data: T): AdminResult<T> => ({ ok: true, data });
const fail = (status: number, error: string): AdminResult<never> => ({ ok: false, status, error });

export interface TeamSummary {
  id: string;
  name: string;
  teamLeadId: string;
  teamLeadName: string;
  memberCount: number;
}

export async function listTeams(tenantId: string): Promise<TeamSummary[]> {
  const teams = await prisma.team.findMany({
    where: { tenantId },
    include: { teamLead: true, _count: { select: { users: true } } },
    orderBy: { name: 'asc' },
  });
  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    teamLeadId: t.teamLeadId,
    teamLeadName: formatWorkerName(t.teamLead),
    memberCount: t._count.users,
  }));
}

export async function createTeam(tenantId: string, input: CreateTeamInput): Promise<AdminResult<{ id: string }>> {
  const lead = await prisma.user.findUnique({ where: { id: input.teamLeadId } });
  if (!lead || lead.tenantId !== tenantId) return fail(400, 'invalid_team_lead');
  if (lead.role !== 'TEAM_LEAD') return fail(400, 'lead_must_be_team_lead_role');

  const team = await prisma.team.create({ data: { tenantId, name: input.name, teamLeadId: input.teamLeadId } });
  return ok({ id: team.id });
}

export async function updateTeam(teamId: string, input: UpdateTeamInput): Promise<AdminResult<true>> {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return fail(404, 'team_not_found');

  if (input.teamLeadId) {
    const lead = await prisma.user.findUnique({ where: { id: input.teamLeadId } });
    if (!lead || lead.tenantId !== team.tenantId) return fail(400, 'invalid_team_lead');
    if (lead.role !== 'TEAM_LEAD') return fail(400, 'lead_must_be_team_lead_role');
  }

  await prisma.team.update({
    where: { id: teamId },
    data: { name: input.name, teamLeadId: input.teamLeadId },
  });
  return ok(true as const);
}

export interface WorkerSummary {
  id: string;
  name: string;
  workerNumber: string | null;
  role: string;
  teamId: string | null;
  teamName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  hasRegistered: boolean;
}

export async function listWorkers(
  tenantId: string,
  filters: { search?: string; role?: string; teamId?: string },
): Promise<WorkerSummary[]> {
  const users = await prisma.user.findMany({
    where: {
      tenantId,
      role: filters.role ? (filters.role as never) : undefined,
      teamId: filters.teamId,
      OR: filters.search
        ? [
            { firstName: { contains: filters.search, mode: 'insensitive' } },
            { lastName: { contains: filters.search, mode: 'insensitive' } },
            { workerNumber: { contains: filters.search, mode: 'insensitive' } },
          ]
        : undefined,
    },
    include: { team: true },
    orderBy: { firstName: 'asc' },
  });

  return users.map((u) => ({
    id: u.id,
    name: formatWorkerName(u),
    workerNumber: u.workerNumber,
    role: u.role,
    teamId: u.teamId,
    teamName: u.team?.name ?? null,
    email: u.email,
    phone: u.phone,
    city: u.city,
    hasRegistered: !!u.email,
  }));
}

export async function createWorker(tenantId: string, input: CreateWorkerInput): Promise<AdminResult<{ id: string }>> {
  const existing = await prisma.user.findUnique({
    where: { tenantId_workerNumber: { tenantId, workerNumber: input.workerNumber } },
  });
  if (existing) return fail(409, 'worker_number_taken');

  if (input.teamId) {
    const team = await prisma.team.findUnique({ where: { id: input.teamId } });
    if (!team || team.tenantId !== tenantId) return fail(400, 'invalid_team');
  }

  const user = await prisma.user.create({
    data: {
      tenantId,
      workerNumber: input.workerNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      teamId: input.teamId,
      email: input.email,
      phone: input.phone,
      city: input.city,
    },
  });
  return ok({ id: user.id });
}

export async function updateWorker(userId: string, input: UpdateWorkerInput): Promise<AdminResult<true>> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return fail(404, 'worker_not_found');

  // Guardrail: don't strand a Team whose teamLeadId points at a user who's no longer a
  // TEAM_LEAD - reassign or remove those teams first. See docs/screens/manage-teams-workers.md.
  if (input.role && input.role !== 'TEAM_LEAD' && user.role === 'TEAM_LEAD') {
    const ledTeams = await prisma.team.findFirst({ where: { teamLeadId: userId } });
    if (ledTeams) return fail(409, 'still_leads_teams');
  }

  if (input.teamId) {
    const team = await prisma.team.findUnique({ where: { id: input.teamId } });
    if (!team || team.tenantId !== user.tenantId) return fail(400, 'invalid_team');
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      teamId: input.teamId,
      email: input.email,
      phone: input.phone,
      city: input.city,
    },
  });
  return ok(true as const);
}
