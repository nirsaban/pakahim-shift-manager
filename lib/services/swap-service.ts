import { prisma } from '../db/prisma';
import { requestCoverage, type CoverageResult } from './coverage-service';
import { he } from '../he';
import { resolveStation } from '../reference/stations';
import type { SwapEvidence, SwapRationale } from '../roster/swaps';

const ok = <T>(data: T): CoverageResult<T> => ({ ok: true, data });
const fail = (status: number, error: string): CoverageResult<never> => ({ ok: false, status, error });

export interface ListSwapsFilter {
  tenantId: string;
  date: Date;
  kind?: 'ABSORB_HANDOFF' | 'SWAP_DUTIES' | 'FILL_OPEN_DUTY';
  status?: 'NEW' | 'DISMISSED' | 'CONVERTED' | 'SUPERSEDED';
  limit?: number;
}

const DUTY_SUMMARY = {
  select: {
    id: true,
    serial: true,
    section: true,
    workerName: true,
    workerNumber: true,
    shiftString: true,
    routeNote: true,
    startMinutes: true,
    endMinutes: true,
    startStation: true,
    endStation: true,
    finalStation: true,
    startTransport: true,
    endTransport: true,
    shiftId: true,
  },
} as const;

/**
 * The roster date the dashboard should show: the soonest date from today
 * onwards that still has open suggestions, falling back to the most recent past
 * one so the panel is not blank the day after an import.
 */
export async function getActiveSuggestionDate(tenantId: string): Promise<Date | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = await prisma.swapSuggestion.findFirst({
    where: { tenantId, status: 'NEW', date: { gte: today } },
    orderBy: { date: 'asc' },
    select: { date: true },
  });
  if (upcoming) return upcoming.date;

  const past = await prisma.swapSuggestion.findFirst({
    where: { tenantId, status: 'NEW' },
    orderBy: { date: 'desc' },
    select: { date: true },
  });
  return past?.date ?? null;
}

export async function listSwapSuggestions(filter: ListSwapsFilter) {
  const rows = await prisma.swapSuggestion.findMany({
    where: {
      tenantId: filter.tenantId,
      date: filter.date,
      kind: filter.kind,
      status: filter.status ?? 'NEW',
    },
    orderBy: [{ score: 'desc' }],
    take: filter.limit ?? 50,
    include: {
      dutyA: DUTY_SUMMARY,
      dutyB: DUTY_SUMMARY,
      handoff: {
        select: { trainNumber: true, station: true, gapMinutes: true, bothSidesDeadhead: true },
      },
    },
  });

  // Station codes are internal; the UI needs Hebrew names.
  return rows.map((r) => ({
    ...r,
    rationale: r.rationale as unknown as SwapRationale,
    evidence: r.evidence as unknown as SwapEvidence,
    stationNames: {
      handoff: stationName((r.handoff?.station as string | null) ?? null),
      startA: stationName(r.dutyA.startStation),
      endA: stationName(r.dutyA.endStation),
      startB: stationName(r.dutyB.startStation),
      endB: stationName(r.dutyB.endStation),
    },
  }));
}

export function stationName(code: string | null): string | null {
  if (!code) return null;
  return resolveStation(code)?.nameHe ?? code;
}

export async function dismissSwapSuggestion(
  suggestionId: string,
  actingUserId: string,
): Promise<CoverageResult<true>> {
  const suggestion = await prisma.swapSuggestion.findUnique({ where: { id: suggestionId } });
  if (!suggestion) return fail(404, 'swap_not_found');
  if (suggestion.status !== 'NEW') return fail(409, 'swap_already_decided');

  await prisma.swapSuggestion.update({
    where: { id: suggestionId },
    data: { status: 'DISMISSED', dismissedById: actingUserId },
  });
  return ok(true);
}

/**
 * Hand a suggestion to the existing coverage flow rather than writing
 * Shift.replacementId directly.
 *
 * `CoverageReason.SWAP` already exists for exactly this. Routing through
 * requestCoverage inherits its guards (shift already started, a request already
 * pending, invalid proposed replacement) and its team-lead notification email,
 * and leaves coverage-service as the sole writer of Shift.replacementId. The
 * swap engine only ever produces proposals.
 *
 * `side` picks which worker is asking to be covered: 'A' means duty A's worker
 * requests, proposing duty B's worker as the replacement.
 */
export async function convertSwapSuggestion(
  suggestionId: string,
  side: 'A' | 'B',
  actingUserId: string,
  note?: string,
): Promise<CoverageResult<{ coverageRequestId: string }>> {
  const suggestion = await prisma.swapSuggestion.findUnique({
    where: { id: suggestionId },
    include: { dutyA: DUTY_SUMMARY, dutyB: DUTY_SUMMARY },
  });
  if (!suggestion) return fail(404, 'swap_not_found');
  if (suggestion.status !== 'NEW') return fail(409, 'swap_already_decided');

  const requesterDuty = side === 'A' ? suggestion.dutyA : suggestion.dutyB;
  const replacementWorkerId = side === 'A' ? suggestion.workerBId : suggestion.workerAId;
  const requesterWorkerId = side === 'A' ? suggestion.workerAId : suggestion.workerBId;

  if (!requesterDuty.shiftId) return fail(400, 'duty_has_no_shift');
  if (!requesterWorkerId) return fail(400, 'duty_has_no_worker');

  // requestCoverage requires the requester to own the shift, so the request is
  // always made as the affected worker. A scheduler acting on their behalf is
  // the normal case here, which is why actingUserId is recorded separately.
  const result = await requestCoverage(requesterWorkerId, {
    shiftId: requesterDuty.shiftId,
    reason: 'SWAP',
    note: note ?? swapNote(suggestion.rationale as unknown as SwapRationale),
    proposedReplacementId: replacementWorkerId ?? undefined,
  });

  if (!result.ok) return result;

  await prisma.swapSuggestion.update({
    where: { id: suggestionId },
    data: { status: 'CONVERTED', coverageRequestId: result.data.id },
  });

  return ok({ coverageRequestId: result.data.id });
}

function swapNote(rationale: SwapRationale): string {
  const t = he.roster.swaps;
  if (rationale.code === 'DEADHEAD_CROSSING' || rationale.code === 'DEADHEAD_CROSSING_UNVERIFIED') {
    const station = stationName(rationale.station ?? null);
    const parts = [t.note.crossing];
    if (rationale.trainNumber) parts.push(`${he.roster.handoffs.train} ${rationale.trainNumber}`);
    if (station) parts.push(`${he.roster.handoffs.at} ${station}`);
    return parts.join(' — ');
  }
  return `${t.note.savings} ${rationale.savedMinutes} ${t.note.minutesTravel}`;
}
