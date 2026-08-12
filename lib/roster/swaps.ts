// Swap scoring.
//
// One exchange formula drives every suggestion:
//
//   cost(duty, home) = travel(home -> duty.start) + travel(duty.end -> home)
//   before = cost(A, homeA) + cost(B, homeB)
//   after  = cost(B, homeA) + cost(A, homeB)
//   saved  = before - after
//
// `duty.end` is the end of the last ACTIVE leg, so the trailing BT ride home is
// exactly the dead-head being priced.
//
// Two candidate sources feed it:
//
//  A. ABSORB_HANDOFF — handoffs already flagged bothSidesDeadhead. The
//     predecessor leaves a station as a passenger at the same minute the
//     successor arrives into it as a passenger. This is direct structural
//     evidence and is emitted even with NO home stations known (43 of 89
//     handoffs on the real roster), which is what makes the feature useful
//     before onboarding has filled the data in.
//
//  B. SWAP_DUTIES — any same-section pair where both home stations are known
//     and the exchange saves real time.

import {
  ASSUMED_LOD_PENALTY,
  DEADHEAD_CROSSING_BONUS,
  HANDOFF_BONUS,
  MIN_SAVED_MINUTES,
  TAXI_WEIGHT,
  UNCERTAINTY_PENALTY,
} from './config';
import { estimateTravelMinutes } from './travel';
import type { DetectedHandoff } from './handoff';
import type { ParsedDuty } from './types';

export type SwapKind = 'ABSORB_HANDOFF' | 'SWAP_DUTIES' | 'FILL_OPEN_DUTY';

export interface WorkerHome {
  workerId: string;
  homeStation: string | null;
}

export interface SwapRationale {
  code:
    | 'DEADHEAD_CROSSING'
    | 'DEADHEAD_CROSSING_UNVERIFIED'
    | 'HOME_STATION_EXCHANGE'
    | 'NEAREST_TO_OPEN_DUTY';
  station?: string | null;
  trainNumber?: string | null;
  savedMinutes: number;
}

export interface SwapEvidence {
  homeA: string | null;
  homeB: string | null;
  startA: string | null;
  endA: string | null;
  startB: string | null;
  endB: string | null;
  costBefore: number | null;
  costAfter: number | null;
  /** How each inspector reaches/leaves their duty — taxi is railway-paid. */
  transportA: { start: string; end: string };
  transportB: { start: string; end: string };
  /** The saving split by who bears the cost. */
  railMinutesSaved: number;
  taxiMinutesSaved: number;
}

export interface SwapCandidate {
  kind: SwapKind;
  dutyA: ParsedDuty;
  dutyB: ParsedDuty;
  handoff: DetectedHandoff | null;
  workerAId: string | null;
  workerBId: string | null;
  score: number;
  savedMinutes: number;
  rationale: SwapRationale;
  evidence: SwapEvidence;
}

export interface GenerateSwapsInput {
  duties: ParsedDuty[];
  handoffs: DetectedHandoff[];
  /** workerNumber -> worker id + home station. Expected to be sparse. */
  homesByWorkerNumber: Map<string, WorkerHome>;
  minSavedMinutes?: number;
}

export interface CostBreakdown {
  /** The inspector's own unpaid travel, riding a service train as a passenger. */
  railMinutes: number;
  /** Railway-paid door-to-door transport (איסוף / פיזור). */
  taxiMinutes: number;
  /** railMinutes + taxiMinutes * TAXI_WEIGHT — what scoring compares. */
  weighted: number;
}

/**
 * Cost of getting one worker to and from one duty, split by who bears it.
 *
 * The two ends are costed independently because the roster states them
 * independently: an end served by a taxi note is railway-paid road transport,
 * an end served by a `bt` leg is the inspector's own time. An end with neither
 * is the Lod convention and is treated as rail.
 *
 * Null when the home station is unknown — callers must skip, never assume zero.
 */
export function dutyCostBreakdown(duty: ParsedDuty, home: string | null): CostBreakdown | null {
  if (!home) return null;
  const inbound = estimateTravelMinutes(home, duty.startStation);
  const outbound = estimateTravelMinutes(duty.endStation, home);
  if (inbound === null || outbound === null) return null;

  const railMinutes =
    (duty.startTransport === 'TAXI' ? 0 : inbound) + (duty.endTransport === 'TAXI' ? 0 : outbound);
  const taxiMinutes =
    (duty.startTransport === 'TAXI' ? inbound : 0) + (duty.endTransport === 'TAXI' ? outbound : 0);

  return { railMinutes, taxiMinutes, weighted: railMinutes + taxiMinutes * TAXI_WEIGHT };
}

/** Total weighted cost, for callers that do not need the split. */
export function dutyCost(duty: ParsedDuty, home: string | null): number | null {
  return dutyCostBreakdown(duty, home)?.weighted ?? null;
}

function assumedEndpointPenalty(a: ParsedDuty, b: ParsedDuty): number {
  const assumed = [a.startSource, a.endSource, b.startSource, b.endSource].filter(
    (s) => s === 'DEFAULT_LOD',
  ).length;
  return assumed * ASSUMED_LOD_PENALTY;
}

function parsePenalty(a: ParsedDuty, b: ParsedDuty): number {
  return a.parseStatus === 'OK' && b.parseStatus === 'OK' ? 0 : UNCERTAINTY_PENALTY;
}

export function generateSwapSuggestions(input: GenerateSwapsInput): SwapCandidate[] {
  const { duties, handoffs, homesByWorkerNumber } = input;
  const minSaved = input.minSavedMinutes ?? MIN_SAVED_MINUTES;

  const candidates: SwapCandidate[] = [];
  const seen = new Set<string>();

  const homeOf = (duty: ParsedDuty): WorkerHome | null =>
    duty.workerNumber ? (homesByWorkerNumber.get(duty.workerNumber) ?? null) : null;

  const pairKey = (kind: SwapKind, a: ParsedDuty, b: ParsedDuty) =>
    `${kind}|${a.section}|${a.serial}|${b.section}|${b.serial}`;

  // --- A. Dead-head crossings surfaced by the handoff graph -----------------
  for (const handoff of handoffs) {
    if (!handoff.bothSidesDeadhead) continue;

    const a = handoff.predecessor;
    const b = handoff.successor;
    const key = pairKey('ABSORB_HANDOFF', a, b);
    if (seen.has(key)) continue;
    seen.add(key);

    const homeA = homeOf(a);
    const homeB = homeOf(b);
    const exchange = priceExchange(a, b, homeA?.homeStation ?? null, homeB?.homeStation ?? null);
    const saved = exchange ? Math.max(0, exchange.saved) : 0;

    candidates.push({
      kind: 'ABSORB_HANDOFF',
      dutyA: a,
      dutyB: b,
      handoff,
      workerAId: homeA?.workerId ?? null,
      workerBId: homeB?.workerId ?? null,
      // Even unpriced this outranks nothing else on the board: it is real
      // structural evidence of two people crossing at the same station.
      score:
        DEADHEAD_CROSSING_BONUS +
        HANDOFF_BONUS +
        saved -
        parsePenalty(a, b) -
        assumedEndpointPenalty(a, b),
      savedMinutes: saved,
      rationale: {
        code: exchange ? 'DEADHEAD_CROSSING' : 'DEADHEAD_CROSSING_UNVERIFIED',
        station: handoff.station,
        trainNumber: handoff.trainNumber,
        savedMinutes: saved,
      },
      evidence: evidenceOf(a, b, homeA, homeB, exchange),
    });
  }

  // --- B. Home-station exchange across the whole section --------------------
  const withHome = duties.filter((d) => homeOf(d)?.homeStation);
  for (let i = 0; i < withHome.length; i += 1) {
    for (let j = i + 1; j < withHome.length; j += 1) {
      const a = withHome[i];
      const b = withHome[j];

      // Same section keeps competence/region intact and lines up with the
      // same-team constraint the existing coverage flow already enforces.
      if (a.section !== b.section) continue;
      // Never silently promote a משני reinforcement into a primary slot.
      if (a.isReinforcement !== b.isReinforcement) continue;

      const homeA = homeOf(a)!;
      const homeB = homeOf(b)!;
      const exchange = priceExchange(a, b, homeA.homeStation, homeB.homeStation);
      if (!exchange) continue;
      if (exchange.saved < minSaved) continue;

      const key = pairKey('SWAP_DUTIES', a, b);
      if (seen.has(key)) continue;
      seen.add(key);

      candidates.push({
        kind: 'SWAP_DUTIES',
        dutyA: a,
        dutyB: b,
        handoff: null,
        workerAId: homeA.workerId,
        workerBId: homeB.workerId,
        score: exchange.saved - parsePenalty(a, b) - assumedEndpointPenalty(a, b),
        savedMinutes: exchange.saved,
        rationale: { code: 'HOME_STATION_EXCHANGE', savedMinutes: exchange.saved },
        evidence: evidenceOf(a, b, homeA, homeB, exchange),
      });
    }
  }

  return candidates.sort((x, y) => y.score - x.score);
}

interface PricedExchange {
  before: number;
  after: number;
  saved: number;
  railSaved: number;
  taxiSaved: number;
}

/**
 * Price swapping duties A and B between their two workers, keeping the rail and
 * taxi components apart so the UI can say which cost is actually being cut.
 * Null when either home station is unknown.
 */
function priceExchange(
  a: ParsedDuty,
  b: ParsedDuty,
  homeA: string | null,
  homeB: string | null,
): PricedExchange | null {
  const aNow = dutyCostBreakdown(a, homeA);
  const bNow = dutyCostBreakdown(b, homeB);
  const aSwapped = dutyCostBreakdown(a, homeB);
  const bSwapped = dutyCostBreakdown(b, homeA);
  if (!aNow || !bNow || !aSwapped || !bSwapped) return null;

  const before = aNow.weighted + bNow.weighted;
  const after = aSwapped.weighted + bSwapped.weighted;
  return {
    before,
    after,
    saved: before - after,
    railSaved: aNow.railMinutes + bNow.railMinutes - (aSwapped.railMinutes + bSwapped.railMinutes),
    taxiSaved: aNow.taxiMinutes + bNow.taxiMinutes - (aSwapped.taxiMinutes + bSwapped.taxiMinutes),
  };
}

function evidenceOf(
  a: ParsedDuty,
  b: ParsedDuty,
  homeA: WorkerHome | null,
  homeB: WorkerHome | null,
  exchange: PricedExchange | null,
): SwapEvidence {
  return {
    homeA: homeA?.homeStation ?? null,
    homeB: homeB?.homeStation ?? null,
    startA: a.startStation,
    endA: a.endStation,
    startB: b.startStation,
    endB: b.endStation,
    costBefore: exchange?.before ?? null,
    costAfter: exchange?.after ?? null,
    transportA: { start: a.startTransport, end: a.endTransport },
    transportB: { start: b.startTransport, end: b.endTransport },
    railMinutesSaved: exchange?.railSaved ?? 0,
    taxiMinutesSaved: exchange?.taxiSaved ?? 0,
  };
}
