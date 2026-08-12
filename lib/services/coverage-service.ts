import { prisma } from '../db/prisma';
import { he } from '../he';
import { sendCoverageDecisionEmail, sendCoverageRequestEmail } from '../mail/mailer';
import { notify } from './push-service';
import { formatWorkerName } from '../utils/display-name';
import type { RequestCoverageInput } from '../validation/coverage';

/** Short "Thu 13/08 06:00-12:15" for notification bodies. */
export function formatShiftWhen(date: Date, startTime: Date, endTime: Date): string {
  const day = date.toLocaleDateString('he-IL', { weekday: 'short', day: '2-digit', month: '2-digit' });
  const from = startTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const to = endTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  return `${day} ${from}-${to}`;
}

export type CoverageResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

const ok = <T>(data: T): CoverageResult<T> => ({ ok: true, data });
const fail = (status: number, error: string): CoverageResult<never> => ({ ok: false, status, error });

/**
 * Roles that can decide any team's coverage requests / directly assign a replacement,
 * not just their own team. Mirrors the open "פטיש" question in docs/modules/roles-permissions.md -
 * scheduler/admin get the same authority as a team lead until that role is resolved.
 */
const CROSS_TEAM_DECIDER_ROLES = new Set(['SHIBUTZ', 'ADMIN', 'SUPER_ADMIN']);

async function canDecideForTeam(actingUserId: string, teamId: string): Promise<boolean> {
  const actor = await prisma.user.findUnique({ where: { id: actingUserId } });
  if (!actor) return false;
  if (CROSS_TEAM_DECIDER_ROLES.has(actor.role)) return true;
  if (actor.role !== 'TEAM_LEAD') return false;
  const led = await prisma.team.findFirst({ where: { id: teamId, teamLeadId: actingUserId } });
  return !!led;
}

/** Can candidateId cover a shift running [startTime, endTime)? False if they're already
 * scheduled to work themselves, or already covering another shift, in that window.
 *
 * Shift.status describes the OWNING worker's attendance (SCHEDULED/STARTED/SICK/HOLIDAY/...),
 * not whether a replacement is busy - a shift with status SICK and replacementId set is
 * exactly the case where the replacement IS actively committed to that window. So the two
 * OR branches need different status filters: as the owner, only SCHEDULED/STARTED counts
 * (they're not working their own SICK/HOLIDAY/CANCELLED shift); as the replacement, anything
 * but CANCELLED counts (SICK/HOLIDAY are the normal case for an active replacement). */
async function hasOverlap(candidateId: string, startTime: Date, endTime: Date, excludeShiftId?: string): Promise<boolean> {
  const overlapping = await prisma.shift.findFirst({
    where: {
      id: excludeShiftId ? { not: excludeShiftId } : undefined,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
      OR: [
        { workerId: candidateId, status: { in: ['SCHEDULED', 'STARTED'] } },
        { replacementId: candidateId, status: { not: 'CANCELLED' } },
      ],
    },
  });
  return !!overlapping;
}

export async function requestCoverage(requestedById: string, input: RequestCoverageInput): Promise<CoverageResult<{ id: string }>> {
  const shift = await prisma.shift.findUnique({ where: { id: input.shiftId } });
  if (!shift) return fail(404, 'shift_not_found');
  if (shift.workerId !== requestedById) return fail(403, 'not_your_shift');
  if (shift.startTime.getTime() <= Date.now()) return fail(400, 'shift_already_started');

  const existingPending = await prisma.coverageRequest.findFirst({
    where: { shiftId: input.shiftId, status: 'PENDING' },
  });
  if (existingPending) return fail(409, 'request_already_pending');

  if (input.proposedReplacementId) {
    const proposed = await prisma.user.findUnique({ where: { id: input.proposedReplacementId } });
    if (!proposed || proposed.role !== 'PAKAHIM' || proposed.teamId !== shift.teamId) {
      return fail(400, 'invalid_proposed_replacement');
    }
  }

  const request = await prisma.coverageRequest.create({
    data: {
      tenantId: shift.tenantId,
      shiftId: shift.id,
      requestedById,
      reason: input.reason,
      note: input.note,
      proposedReplacementId: input.proposedReplacementId,
    },
  });

  const team = await prisma.team.findUnique({ where: { id: shift.teamId }, include: { teamLead: true } });
  const requester = await prisma.user.findUnique({ where: { id: requestedById } });
  if (team?.teamLead.email && requester) {
    await sendCoverageRequestEmail(team.teamLead.email, {
      requesterName: formatWorkerName(requester),
      shiftDate: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      reason: input.reason,
    }).catch(() => {});
  }

  if (team && requester) {
    notify([team.teamLeadId], {
      title: he.push.coverageRequested.title,
      body: he.push.coverageRequested.body(
        formatWorkerName(requester),
        formatShiftWhen(shift.date, shift.startTime, shift.endTime),
      ),
      url: '/dashboard',
      tag: `coverage-${request.id}`,
    });
  }

  return ok({ id: request.id });
}

export async function cancelCoverageRequest(requestId: string, actingUserId: string): Promise<CoverageResult<true>> {
  const request = await prisma.coverageRequest.findUnique({ where: { id: requestId } });
  if (!request) return fail(404, 'request_not_found');
  if (request.requestedById !== actingUserId) return fail(403, 'not_your_request');
  if (request.status !== 'PENDING') return fail(409, 'request_not_pending');

  await prisma.coverageRequest.update({ where: { id: requestId }, data: { status: 'CANCELLED' } });
  return ok(true as const);
}

export async function decideCoverageRequest(
  requestId: string,
  decidedById: string,
  decision: 'APPROVE' | 'REJECT',
  opts: { replacementId?: string; decisionNote?: string },
): Promise<CoverageResult<true>> {
  const request = await prisma.coverageRequest.findUnique({ where: { id: requestId }, include: { shift: true } });
  if (!request) return fail(404, 'request_not_found');
  if (request.status !== 'PENDING') return fail(409, 'request_not_pending');

  const authorized = await canDecideForTeam(decidedById, request.shift.teamId);
  if (!authorized) return fail(403, 'not_authorized');

  if (decision === 'REJECT') {
    await prisma.coverageRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED', decidedById, decidedAt: new Date(), decisionNote: opts.decisionNote },
    });
    const requester = await prisma.user.findUnique({ where: { id: request.requestedById } });
    if (requester?.email) {
      await sendCoverageDecisionEmail(requester.email, {
        approved: false,
        shiftDate: request.shift.date,
        startTime: request.shift.startTime,
        endTime: request.shift.endTime,
        decisionNote: opts.decisionNote,
      }).catch(() => {});
    }
    notify([request.requestedById], {
      title: he.push.coverageRejected.title,
      body: he.push.coverageRejected.body(
        formatShiftWhen(request.shift.date, request.shift.startTime, request.shift.endTime),
      ),
      url: '/dashboard',
      tag: `coverage-${requestId}`,
    });
    return ok(true as const);
  }

  const finalReplacementId = opts.replacementId ?? request.proposedReplacementId ?? undefined;
  if (!finalReplacementId) return fail(400, 'replacement_required');

  const replacement = await prisma.user.findUnique({ where: { id: finalReplacementId } });
  if (!replacement || replacement.role !== 'PAKAHIM') return fail(400, 'invalid_replacement');
  if (replacement.id === request.shift.workerId) return fail(400, 'cannot_replace_self');
  if (await hasOverlap(finalReplacementId, request.shift.startTime, request.shift.endTime, request.shift.id)) {
    return fail(409, 'replacement_has_overlapping_shift');
  }

  const newShiftStatus =
    request.reason === 'SICK' ? 'SICK' : request.reason === 'HOLIDAY' ? 'HOLIDAY' : request.shift.status;

  await prisma.$transaction([
    prisma.shift.update({
      where: { id: request.shiftId },
      data: { replacementId: finalReplacementId, status: newShiftStatus },
    }),
    prisma.coverageRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED', decidedById, decidedAt: new Date(), decisionNote: opts.decisionNote },
    }),
  ]);

  const [requester] = await Promise.all([prisma.user.findUnique({ where: { id: request.requestedById } })]);
  await Promise.all([
    requester?.email
      ? sendCoverageDecisionEmail(requester.email, {
          approved: true,
          shiftDate: request.shift.date,
          startTime: request.shift.startTime,
          endTime: request.shift.endTime,
          replacementName: formatWorkerName(replacement),
          decisionNote: opts.decisionNote,
        }).catch(() => {})
      : Promise.resolve(),
    replacement.email
      ? sendCoverageDecisionEmail(replacement.email, {
          approved: true,
          assignedAsReplacement: true,
          shiftDate: request.shift.date,
          startTime: request.shift.startTime,
          endTime: request.shift.endTime,
          decisionNote: opts.decisionNote,
        }).catch(() => {})
      : Promise.resolve(),
  ]);

  const when = formatShiftWhen(request.shift.date, request.shift.startTime, request.shift.endTime);
  notify([request.requestedById], {
    title: he.push.coverageApproved.title,
    body: he.push.coverageApproved.body(when),
    url: '/dashboard',
    tag: `coverage-${requestId}`,
  });
  notify([replacement.id], {
    title: he.push.assignedAsReplacement.title,
    body: he.push.assignedAsReplacement.body(
      requester ? formatWorkerName(requester) : '',
      when,
    ),
    url: '/dashboard',
    tag: `replacement-${request.shiftId}`,
  });

  return ok(true as const);
}

export async function assignReplacement(
  shiftId: string,
  replacementId: string | null,
  actingUserId: string,
): Promise<CoverageResult<true>> {
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) return fail(404, 'shift_not_found');

  const authorized = await canDecideForTeam(actingUserId, shift.teamId);
  if (!authorized) return fail(403, 'not_authorized');

  if (replacementId) {
    const replacement = await prisma.user.findUnique({ where: { id: replacementId } });
    if (!replacement || replacement.role !== 'PAKAHIM') return fail(400, 'invalid_replacement');
    if (replacement.id === shift.workerId) return fail(400, 'cannot_replace_self');
    if (await hasOverlap(replacementId, shift.startTime, shift.endTime, shift.id)) {
      return fail(409, 'replacement_has_overlapping_shift');
    }
    await prisma.shift.update({ where: { id: shiftId }, data: { replacementId } });
    if (replacement.email) {
      await sendCoverageDecisionEmail(replacement.email, {
        approved: true,
        assignedAsReplacement: true,
        shiftDate: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
      }).catch(() => {});
    }
    const owner = await prisma.user.findUnique({ where: { id: shift.workerId } });
    notify([replacement.id], {
      title: he.push.assignedAsReplacement.title,
      body: he.push.assignedAsReplacement.body(
        owner ? formatWorkerName(owner) : '',
        formatShiftWhen(shift.date, shift.startTime, shift.endTime),
      ),
      url: '/dashboard',
      tag: `replacement-${shiftId}`,
    });
  } else {
    await prisma.shift.update({ where: { id: shiftId }, data: { replacementId: null } });
  }

  return ok(true as const);
}

export interface PendingCoverageRequest {
  id: string;
  shiftId: string;
  requesterName: string;
  shiftDate: Date;
  startTime: Date;
  endTime: Date;
  reason: string;
  note: string | null;
  proposedReplacementName: string | null;
  proposedReplacementId: string | null;
}

export async function listPendingCoverageRequests(teamId: string | string[]): Promise<PendingCoverageRequest[]> {
  const teamFilter = Array.isArray(teamId) ? { in: teamId } : teamId;
  const requests = await prisma.coverageRequest.findMany({
    where: { status: 'PENDING', shift: { teamId: teamFilter } },
    include: { shift: true, requestedBy: true, proposedReplacement: true },
    orderBy: { createdAt: 'asc' },
  });

  return requests.map((r) => ({
    id: r.id,
    shiftId: r.shiftId,
    requesterName: formatWorkerName(r.requestedBy),
    shiftDate: r.shift.date,
    startTime: r.shift.startTime,
    endTime: r.shift.endTime,
    reason: r.reason,
    note: r.note,
    proposedReplacementName: r.proposedReplacement ? formatWorkerName(r.proposedReplacement) : null,
    proposedReplacementId: r.proposedReplacementId,
  }));
}

export interface CoveringShift {
  shiftId: string;
  workerName: string;
  date: Date;
  startTime: Date;
  endTime: Date;
}

/** Shifts this worker agreed (or was assigned) to cover for someone else - the
 * reciprocal view described in docs/modules/coverage-engine.md. */
export async function getShiftsCoveringFor(workerId: string): Promise<CoveringShift[]> {
  const shifts = await prisma.shift.findMany({
    where: { replacementId: workerId, endTime: { gte: new Date() } },
    include: { worker: true },
    orderBy: { startTime: 'asc' },
  });
  return shifts.map((s) => ({
    shiftId: s.id,
    workerName: formatWorkerName(s.worker),
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
  }));
}

export async function getPendingRequestForShift(shiftId: string) {
  return prisma.coverageRequest.findFirst({ where: { shiftId, status: 'PENDING' } });
}

/** Same-team PAKAHIM roster for the "propose who covers" / direct-assign pickers. */
export async function getSameTeamCandidates(teamId: string, excludeUserId: string) {
  const members = await prisma.user.findMany({
    where: { teamId, role: 'PAKAHIM', id: { not: excludeUserId } },
    orderBy: { firstName: 'asc' },
  });
  return members.map((m) => ({ id: m.id, name: formatWorkerName(m) }));
}
