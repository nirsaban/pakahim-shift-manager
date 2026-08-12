// Handoff detection: who takes over which train from whom.
//
// Rule (calibrated against the real rosters):
//   predecessor.lastActiveTrain === successor.firstActiveTrain
//   AND both duties sit in the same matching block
//   AND |successor.start - predecessor.end| <= window (default 90 min, wrap-aware)
//
// BT legs are excluded by construction — firstActiveTrain/lastActiveTrain only
// ever look at isDuty legs — which is what stops the inspector who merely rides
// train 510 home (`510bt`) from being scored as its replacer.
//
// On משני: reinforcement lines form their OWN matching block rather than being
// dropped. They are a מערך כפול double crew, so a משני line and a primary line
// routinely end on the same train at the same minute. Letting them compete for
// one successor produces genuine ambiguity (measured: 16 ambiguous successors);
// keeping them in separate blocks yields 89 handoffs with ZERO ambiguity and
// preserves the reinforcement crew's own handoff chain.

import { HANDOFF_WINDOW_MINUTES } from './config';
import type { ParsedDuty, ParsedLeg } from './types';

export interface DetectedHandoff {
  trainNumber: string;
  predecessor: ParsedDuty;
  successor: ParsedDuty;
  /** Where the baton passes, when we can tell. */
  station: string | null;
  predecessorEndMinutes: number;
  successorStartMinutes: number;
  gapMinutes: number;
  isReinforcement: boolean;
  confidence: number;
  /**
   * The flagship signature: the predecessor leaves this station as a passenger
   * while the successor arrives into it as a passenger. Two inspectors
   * dead-heading in opposite directions through the same station at the same
   * minute — a swap candidate that needs NO home-station data.
   * Measured: 43 of 89 handoffs, and in all 43 the two stations agreed.
   */
  bothSidesDeadhead: boolean;
  predecessorExitTrain: string | null;
  successorEntryTrain: string | null;
}

export interface DetectHandoffOptions {
  windowMinutes?: number;
}

/** Circular distance in minutes, so a 23:50 -> 00:30 handoff is 40 apart, not 1400. */
export function circularDiff(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 1440 - d);
}

/** משני lines match only other משני lines; everything else matches within its section. */
function matchingBlock(duty: ParsedDuty): string {
  return duty.isReinforcement ? 'REINFORCEMENT' : duty.section;
}

export function detectHandoffs(
  duties: ParsedDuty[],
  options: DetectHandoffOptions = {},
): DetectedHandoff[] {
  const window = options.windowMinutes ?? HANDOFF_WINDOW_MINUTES;

  // Index predecessors by (block, last active train) so this stays O(n).
  const byLastTrain = new Map<string, ParsedDuty[]>();
  for (const duty of duties) {
    if (!duty.lastActiveTrain || duty.endMinutes === null) continue;
    const key = `${matchingBlock(duty)}|${duty.lastActiveTrain}`;
    const bucket = byLastTrain.get(key);
    if (bucket) bucket.push(duty);
    else byLastTrain.set(key, [duty]);
  }

  const handoffs: DetectedHandoff[] = [];

  for (const successor of duties) {
    if (!successor.firstActiveTrain || successor.startMinutes === null) continue;

    const key = `${matchingBlock(successor)}|${successor.firstActiveTrain}`;
    const candidates = (byLastTrain.get(key) ?? []).filter(
      (p) =>
        p.rowIndex !== successor.rowIndex &&
        p.endMinutes !== null &&
        circularDiff(successor.startMinutes as number, p.endMinutes) <= window,
    );

    for (const predecessor of candidates) {
      const gap = circularDiff(successor.startMinutes, predecessor.endMinutes as number);
      const signature = deadheadSignature(predecessor, successor);

      handoffs.push({
        trainNumber: successor.firstActiveTrain,
        predecessor,
        successor,
        station: signature.station,
        predecessorEndMinutes: predecessor.endMinutes as number,
        successorStartMinutes: successor.startMinutes,
        gapMinutes: gap,
        isReinforcement: successor.isReinforcement,
        // Ambiguity is possible in principle even if it does not occur in the
        // sample; degrade confidence rather than silently picking a winner.
        confidence: candidates.length === 1 ? 1 : 1 / candidates.length,
        bothSidesDeadhead: signature.bothSides,
        predecessorExitTrain: signature.exitTrain,
        successorEntryTrain: signature.entryTrain,
      });
    }
  }

  return handoffs;
}

interface Signature {
  station: string | null;
  bothSides: boolean;
  exitTrain: string | null;
  entryTrain: string | null;
}

function deadheadSignature(predecessor: ParsedDuty, successor: ParsedDuty): Signature {
  const tail = tailAfterLastActive(predecessor.legs);
  const head = headBeforeFirstActive(successor.legs);

  const exit = tail.find((l) => l.kind === 'TRANSIT');
  const entry = [...head].reverse().find((l) => l.kind === 'TRANSIT');

  const exitStation = exit?.fromStation ?? predecessor.endStation ?? null;
  const entryStation = entry?.toStation ?? successor.startStation ?? null;

  const bothSides =
    Boolean(exit && entry) && exitStation !== null && exitStation === entryStation;

  return {
    station: exitStation ?? entryStation,
    bothSides,
    exitTrain: exit?.trainNumber ?? null,
    entryTrain: entry?.trainNumber ?? null,
  };
}

function tailAfterLastActive(legs: ParsedLeg[]): ParsedLeg[] {
  let last = -1;
  legs.forEach((l, i) => {
    if (l.kind === 'TRAIN' && l.isDuty) last = i;
  });
  return last === -1 ? [] : legs.slice(last + 1);
}

function headBeforeFirstActive(legs: ParsedLeg[]): ParsedLeg[] {
  const first = legs.findIndex((l) => l.kind === 'TRAIN' && l.isDuty);
  return first === -1 ? [] : legs.slice(0, first);
}
