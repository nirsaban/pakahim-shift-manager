// Where an inspector probably is, at a given minute of their shift.
//
// THE HONEST LIMITATION, first, because everything here follows from it: the
// roster file carries no timetable. It states when a duty starts, when it ends,
// and the ordered list of trains and operations in between - and nothing about
// when any individual leg happens. So this cannot report a position; it can only
// derive one, by spreading the duty's real duration across its legs in
// proportion to how long each leg ought to take.
//
// "Ought to take" comes from the same stop-distance graph the swap engine scores
// with (lib/roster/travel.ts), which is transcribed from the ops booklet. A leg
// between two known stations is weighted by its estimated minutes; one with an
// unknown endpoint - the roster leaves interior transfers null on purpose rather
// than guessing - falls back to an average, and says so through `confidence`.
//
// Pure, and deliberately so: the commander board runs this in the browser for
// every duty on every scrub of the time slider, without a round trip.

import { estimateTravelMinutes } from './travel';

/** What an inspector is doing at a moment, not where. */
export type PositionKind = 'DUTY' | 'DEADHEAD' | 'STANDBY' | 'OPERATION' | 'TAXI' | 'IDLE';

export interface PositionLeg {
  seq: number;
  kind: string;
  isDuty: boolean;
  trainNumber: string | null;
  fromStation: string | null;
  toStation: string | null;
}

export interface PositionDuty {
  startMinutes: number | null;
  endMinutes: number | null;
  legs: PositionLeg[];
}

export interface EstimatedPosition {
  kind: PositionKind;
  /** The leg they are on, or null when the duty has no legs at all. */
  legSeq: number | null;
  trainNumber: string | null;
  fromStation: string | null;
  toStation: string | null;
  /** 0..1 through the current leg. */
  progress: number;
  /**
   * How much to trust the placement.
   *  'STATED'   - both endpoints of the leg are known, weighted by real distance
   *  'ESTIMATED'- an endpoint is unknown, so the leg got the average weight
   */
  confidence: 'STATED' | 'ESTIMATED';
}

/** A leg with no distance to measure still takes time; this is what it gets. */
const AVERAGE_MOVEMENT_MINUTES = 35;

/** Operations, standby and station markers are dwell, not travel. */
const DWELL_MINUTES = 10;

function isMovement(leg: PositionLeg): boolean {
  return leg.kind === 'TRAIN' || leg.kind === 'TRANSIT' || leg.kind === 'TAXI';
}

function legKind(leg: PositionLeg): PositionKind {
  if (leg.kind === 'TRAIN') return leg.isDuty ? 'DUTY' : 'DEADHEAD';
  if (leg.kind === 'TRANSIT') return 'DEADHEAD';
  if (leg.kind === 'TAXI') return 'TAXI';
  if (leg.kind === 'STANDBY') return 'STANDBY';
  if (leg.kind === 'OPS' || leg.kind === 'INSPECTION') return 'OPERATION';
  return 'IDLE';
}

/** What this leg ought to take, and whether that number rests on real distance. */
function weigh(leg: PositionLeg): { minutes: number; stated: boolean } {
  if (!isMovement(leg)) return { minutes: DWELL_MINUTES, stated: false };
  if (leg.fromStation && leg.toStation) {
    const minutes = estimateTravelMinutes(leg.fromStation, leg.toStation);
    if (minutes !== null && minutes > 0) return { minutes, stated: true };
  }
  return { minutes: AVERAGE_MOVEMENT_MINUTES, stated: false };
}

/** Duty duration in minutes, handling the ones that run past midnight. */
export function dutyDurationMinutes(duty: PositionDuty): number | null {
  if (duty.startMinutes === null || duty.endMinutes === null) return null;
  const raw = duty.endMinutes - duty.startMinutes;
  return raw > 0 ? raw : raw + 24 * 60;
}

/**
 * Is this duty running at `atMinutes` (minutes past midnight on its own date)?
 *
 * A duty ending after midnight is still the same duty: 20:30-02:40 is running at
 * 01:00, which reads as minute 1500 on its own roster date.
 */
export function isRunningAt(duty: PositionDuty, atMinutes: number): boolean {
  const duration = dutyDurationMinutes(duty);
  if (duration === null || duty.startMinutes === null) return false;
  const elapsed = elapsedAt(duty, atMinutes);
  return elapsed !== null && elapsed >= 0 && elapsed <= duration;
}

/** Minutes into the duty at a given clock minute, or null when it is not running. */
export function elapsedAt(duty: PositionDuty, atMinutes: number): number | null {
  if (duty.startMinutes === null) return null;
  const duration = dutyDurationMinutes(duty);
  if (duration === null) return null;

  // Try both readings of "now": today's minute, and today's minute a day later,
  // which is what an 01:00 clock reading means for a duty that began at 20:30.
  for (const candidate of [atMinutes, atMinutes + 24 * 60]) {
    const elapsed = candidate - duty.startMinutes;
    if (elapsed >= 0 && elapsed <= duration) return elapsed;
  }
  return null;
}

/**
 * Where the inspector is, `atMinutes` past midnight.
 *
 * Returns null when the duty is not running then - the caller's cue to leave
 * them off the board entirely rather than draw them somewhere arbitrary.
 */
export function estimatePosition(duty: PositionDuty, atMinutes: number): EstimatedPosition | null {
  const elapsed = elapsedAt(duty, atMinutes);
  const duration = dutyDurationMinutes(duty);
  if (elapsed === null || duration === null) return null;

  const legs = [...duty.legs].sort((a, b) => a.seq - b.seq);
  if (legs.length === 0) {
    return {
      kind: 'IDLE',
      legSeq: null,
      trainNumber: null,
      fromStation: null,
      toStation: null,
      progress: duration > 0 ? elapsed / duration : 0,
      confidence: 'ESTIMATED',
    };
  }

  const weights = legs.map(weigh);
  const total = weights.reduce((sum, w) => sum + w.minutes, 0);

  // Scale the notional weights onto the duty's real duration. The roster's own
  // start and end are facts; the weights only decide how the time between them
  // is apportioned.
  const scale = total > 0 ? duration / total : 0;

  let cursor = 0;
  for (let i = 0; i < legs.length; i += 1) {
    const span = weights[i].minutes * scale;
    const isLast = i === legs.length - 1;
    if (elapsed <= cursor + span || isLast) {
      const leg = legs[i];
      return {
        kind: legKind(leg),
        legSeq: leg.seq,
        trainNumber: leg.trainNumber,
        fromStation: leg.fromStation,
        toStation: leg.toStation,
        progress: span > 0 ? Math.min(1, Math.max(0, (elapsed - cursor) / span)) : 0,
        confidence: weights[i].stated ? 'STATED' : 'ESTIMATED',
      };
    }
    cursor += span;
  }

  return null;
}
