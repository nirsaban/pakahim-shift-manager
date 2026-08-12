// Tunable constants for the roster engine. Every default here was calibrated
// against the two real roster files; see scripts/verify-roster.ts.

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Maximum |successor.start - predecessor.end| for a handoff, in minutes.
 *
 * Measured on 13.08.26 (משני treated as its own matching block, always zero
 * ambiguity): 45 -> 32 handoffs, 60 -> 32, 90 -> 62, 120 -> 62, 180 -> 62.
 * The recorded start/end times are loose — successors routinely show a start
 * 15-30 min before the predecessor's listed end — so 90 is the knee: it roughly
 * doubles coverage over 60 and nothing further is gained past it.
 */
export const HANDOFF_WINDOW_MINUTES = envInt('ROSTER_HANDOFF_WINDOW_MINUTES', 90);

/** Below this, a swap is not worth proposing to a human. */
export const MIN_SAVED_MINUTES = envInt('ROSTER_MIN_SAVED_MINUTES', 30);

/** Travel estimator, used until a measured station-to-station matrix exists. */
export const TRAVEL_FIXED_OVERHEAD_MINUTES = 10;
export const TRAVEL_MINUTES_PER_STOP = 6;
export const TRAVEL_CROSS_LINE_MINUTES = 90;

/**
 * Relative weight of taxi minutes against rail-transit minutes when scoring.
 *
 * They are different currencies. A `bt` rail leg is the inspector's own unpaid
 * travel time; an איסוף/פיזור taxi is door-to-door transport the railway already
 * pays for, so shortening it saves money rather than the inspector's time.
 * Default 1 treats them as equally worth saving; lower it to prioritise the
 * inspector's own time, raise it to prioritise taxi cost.
 */
export const TAXI_WEIGHT = Number(process.env.ROSTER_TAXI_WEIGHT ?? 1);

/** Swap scoring weights. */
export const HANDOFF_BONUS = 20;
export const DEADHEAD_CROSSING_BONUS = 25;
export const UNCERTAINTY_PENALTY = 10;
export const ASSUMED_LOD_PENALTY = 5;
export const DURATION_MISMATCH_PENALTY_PER_HOUR = 5;
