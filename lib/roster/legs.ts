// Turn a token stream into legs: board station -> train -> alight station.
//
// The two rules that matter most:
//
//  * The Lod default is the LAST resort. A route note beats a station token
//    beats the convention. Applying Lod mid-string would silently poison every
//    distance calculation, so a train->train transfer with no station token is
//    recorded as INFERRED_TRANSFER with a null station — a known unknown — and
//    never as Lod.
//
//  * A duty ENDS at the last active leg, not at the end of the string. In
//    `2107-152-109-hagana-409bt` the duty ends at hagana; `409bt` is the ride
//    home. The gap between endStation and finalStation IS the dead-head, and it
//    is the thing the swap engine scores.

import { DEFAULT_STATION_CODE, resolveStation } from '../reference/stations';
import { resolveLine } from '../reference/lines';
import type { ParsedLeg, ParsedRouteNote, StationSource, Token } from './types';

interface Cursor {
  station: string | null;
  source: StationSource;
}

const MOVEMENT: ReadonlySet<string> = new Set(['TRAIN', 'TRANSIT', 'TAXI']);

export interface BuildLegsResult {
  legs: ParsedLeg[];
  startStation: string | null;
  startSource: StationSource;
  endStation: string | null;
  endSource: StationSource;
  finalStation: string | null;
}

export function buildLegs(tokens: Token[], routeNote: ParsedRouteNote | null): BuildLegsResult {
  const legs: ParsedLeg[] = [];

  const cursor: Cursor = initialCursor(tokens, routeNote);
  const startStation = cursor.station;
  const startSource = cursor.source;

  for (const token of tokens) {
    switch (token.kind) {
      case 'STATION': {
        const code = resolveStation(token.stationKey)?.code ?? null;
        closeOpenLeg(legs, code, code ? 'EXPLICIT_TOKEN' : 'UNKNOWN');
        cursor.station = code;
        cursor.source = code ? 'EXPLICIT_TOKEN' : 'UNKNOWN';
        break;
      }

      case 'TRAIN':
      case 'TRANSIT': {
        closeOpenLeg(legs, null, 'INFERRED_TRANSFER');
        const resolved = resolveLine(token.train);
        legs.push({
          seq: legs.length,
          kind: token.kind,
          isDuty: token.kind === 'TRAIN',
          rawTokens: token.raw,
          trainNumber: token.train,
          lineCode: resolved?.line.code ?? null,
          isServiceMove: resolved?.isServiceMove ?? false,
          opCode: null,
          opOperands: [],
          atMinutes: null,
          fromStation: cursor.station,
          fromSource: cursor.station ? cursor.source : 'INFERRED_TRANSFER',
          toStation: null,
          toSource: 'UNKNOWN',
        });
        cursor.station = null;
        cursor.source = 'UNKNOWN';
        break;
      }

      case 'TAXI': {
        const code = resolveStation(token.stationKey)?.code ?? null;
        closeOpenLeg(legs, null, 'INFERRED_TRANSFER');
        legs.push({
          seq: legs.length,
          kind: 'TAXI',
          isDuty: false,
          rawTokens: token.raw,
          trainNumber: null,
          lineCode: null,
          isServiceMove: false,
          opCode: null,
          opOperands: [],
          atMinutes: token.minutes,
          fromStation: cursor.station,
          fromSource: cursor.station ? cursor.source : 'INFERRED_TRANSFER',
          toStation: code,
          toSource: code ? 'EXPLICIT_TOKEN' : 'UNKNOWN',
        });
        cursor.station = code;
        cursor.source = code ? 'EXPLICIT_TOKEN' : 'UNKNOWN';
        break;
      }

      case 'STANDBY': {
        // A located standby (konan_navon) is real positional information.
        const code = token.stationKey ? (resolveStation(token.stationKey)?.code ?? null) : null;
        if (code) {
          closeOpenLeg(legs, code, 'EXPLICIT_TOKEN');
          cursor.station = code;
          cursor.source = 'EXPLICIT_TOKEN';
        }
        legs.push(stationaryLeg(legs.length, 'STANDBY', token.raw, cursor, null, []));
        break;
      }

      case 'OPS': {
        legs.push(stationaryLeg(legs.length, 'OPS', token.raw, cursor, token.code, token.operands));
        break;
      }

      case 'INSPECTION': {
        legs.push(stationaryLeg(legs.length, 'INSPECTION', token.raw, cursor, 'bdika', [token.setNumber]));
        break;
      }

      case 'UNKNOWN': {
        legs.push(stationaryLeg(legs.length, 'UNKNOWN', token.raw, cursor, null, []));
        break;
      }
    }
  }

  // Terminate: route note wins, Lod convention is the fallback.
  const endCode = routeNote?.dispersalStation ?? null;
  closeOpenLeg(legs, endCode ?? DEFAULT_STATION_CODE, endCode ? 'ROUTE_NOTE' : 'DEFAULT_LOD');

  const lastDuty = [...legs].reverse().find((l) => l.isDuty && MOVEMENT.has(l.kind));
  const lastAny = [...legs].reverse().find((l) => MOVEMENT.has(l.kind));

  return {
    legs,
    startStation,
    startSource,
    endStation: lastDuty?.toStation ?? null,
    endSource: lastDuty?.toSource ?? 'UNKNOWN',
    finalStation: lastAny?.toStation ?? null,
  };
}

function initialCursor(tokens: Token[], routeNote: ParsedRouteNote | null): Cursor {
  if (routeNote?.pickupStation) {
    return { station: routeNote.pickupStation, source: 'ROUTE_NOTE' };
  }
  const first = tokens[0];
  if (first?.kind === 'STATION') {
    const code = resolveStation(first.stationKey)?.code ?? null;
    if (code) return { station: code, source: 'EXPLICIT_TOKEN' };
  }
  if (first?.kind === 'STANDBY' && first.stationKey) {
    const code = resolveStation(first.stationKey)?.code ?? null;
    if (code) return { station: code, source: 'EXPLICIT_TOKEN' };
  }
  return { station: DEFAULT_STATION_CODE, source: 'DEFAULT_LOD' };
}

/** Fill the `to` of the most recent movement leg, if it is still open. */
function closeOpenLeg(legs: ParsedLeg[], station: string | null, source: StationSource): void {
  for (let i = legs.length - 1; i >= 0; i -= 1) {
    const leg = legs[i];
    if (!MOVEMENT.has(leg.kind)) continue;
    if (leg.toStation === null && leg.toSource === 'UNKNOWN') {
      leg.toStation = station;
      leg.toSource = source;
    }
    return;
  }
}

function stationaryLeg(
  seq: number,
  kind: ParsedLeg['kind'],
  rawTokens: string[],
  cursor: Cursor,
  opCode: ParsedLeg['opCode'],
  opOperands: string[],
): ParsedLeg {
  return {
    seq,
    kind,
    isDuty: kind !== 'UNKNOWN',
    rawTokens,
    trainNumber: null,
    lineCode: null,
    isServiceMove: false,
    opCode,
    opOperands,
    atMinutes: null,
    fromStation: cursor.station,
    fromSource: cursor.station ? cursor.source : 'UNKNOWN',
    toStation: cursor.station,
    toSource: cursor.station ? cursor.source : 'UNKNOWN',
  };
}
