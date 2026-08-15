// Who else is aboard a train an inspector is working.
//
// The roster already says this, it just says it sideways: a `bt` leg is an
// inspector riding a service train as a passenger rather than working it (see
// TransportMode in types.ts). So every inspector travelling to or from a shift
// on MY train is a TRANSIT leg somewhere else in the same day's file carrying my
// train number. Nobody could find that by hand - it means reading all 255 lines
// and decoding each shift string.
//
// Pure like the rest of lib/roster/: the service layer supplies rows.

/** Where a rider is going, relative to their own duty. */
export type RideDirection = 'TO_SHIFT' | 'FROM_SHIFT' | 'MID_SHIFT';

export interface CompanionLeg {
  seq: number;
  kind: string;
  isDuty: boolean;
  trainNumber: string | null;
  fromStation: string | null;
  fromSource?: string;
  toStation: string | null;
  toSource?: string;
}

/**
 * Only these two sources are things the roster actually SAID.
 *
 * DEFAULT_LOD is the convention that a shift begins and ends at Lod, and
 * INFERRED_TRANSFER is a deliberate "we do not know". Both are fine for scoring
 * a swap, where a systematic assumption applies equally to both sides. They are
 * not fine on a screen that tells an inspector where a colleague gets on: on the
 * real 14.08 roster that would have printed "boards at Lod" for two people whose
 * boarding station the file never states.
 */
const STATED_SOURCES = new Set(['EXPLICIT_TOKEN', 'ROUTE_NOTE']);

function stated(station: string | null, source: string | undefined): string | null {
  if (!station) return null;
  // An absent source means the caller is not tracking provenance (tests, older
  // callers); take the station at face value rather than silently blanking it.
  if (source === undefined) return station;
  return STATED_SOURCES.has(source) ? station : null;
}

/** Where they get on, only when the roster says so rather than assuming Lod. */
export function boardStation(leg: CompanionLeg): string | null {
  return stated(leg.fromStation, leg.fromSource);
}

/**
 * Is this passenger leg carrying them TO their duty, home FROM it, or between
 * two working legs?
 *
 * Direction is positional, not temporal: leg times are not in the source. A
 * transit leg before every working leg is the ride in, one after them all is the
 * ride home, and one in between is a repositioning move mid-shift - worth
 * distinguishing because only the first means "they are on their way to work
 * and can be handed something".
 */
export function rideDirection(legs: CompanionLeg[], seq: number): RideDirection {
  const working = legs.filter((l) => l.isDuty).map((l) => l.seq);
  if (working.length === 0) return 'TO_SHIFT';
  if (seq < working[0]) return 'TO_SHIFT';
  if (seq > working[working.length - 1]) return 'FROM_SHIFT';
  return 'MID_SHIFT';
}

/**
 * Where the rider gets off, best effort.
 *
 * The transit leg's own `toStation` is the statement to trust. Interior legs
 * routinely leave it null rather than guess (see StationSource.INFERRED_TRANSFER)
 * — for a ride TO a shift, the duty's own start station is then the honest
 * fallback, because that is where the ride is taking them, but only when the
 * roster stated that too. Nothing here is allowed to become "probably Lod".
 */
export function alightStation(
  leg: CompanionLeg,
  direction: RideDirection,
  dutyStart: { station: string | null; source?: string },
): string | null {
  const own = stated(leg.toStation, leg.toSource);
  if (own) return own;
  return direction === 'TO_SHIFT' ? stated(dutyStart.station, dutyStart.source) : null;
}
