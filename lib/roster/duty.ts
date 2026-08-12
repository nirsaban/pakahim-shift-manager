// Orchestrates tokenize -> route note -> legs into one ParsedDuty.

import { createHash } from 'node:crypto';
import { parseRouteNote } from './route-note';
import { buildLegs } from './legs';
import { tokenizeShiftString, type StationResolver } from './tokenize';
import type { ParsedDuty, ParsedLeg, ParseStatus, RosterRowInput, TransportMode } from './types';

/**
 * (section, serial, shiftString) identifies a duty TEMPLATE. Across 12.08 and
 * 13.08, 224 of 253 shared duties had a byte-identical shift string while only
 * 14 kept the same inspector — so hashing the template lets us parse each
 * distinct code once instead of 255 times a day.
 */
export function computeTemplateHash(section: string, serial: string, shiftString: string): string {
  const normalizedSerial = serial.replace(/^משני/, 'M');
  return createHash('sha256')
    .update(`${section}|${normalizedSerial}|${shiftString}`)
    .digest('hex');
}

export function isReinforcementSerial(serial: string): boolean {
  return /^משני/.test(String(serial ?? '').trim());
}

/**
 * A taxi note wins over a `bt` leg when (rarely) both appear at the same end:
 * the note is the scheduler's explicit statement about how the inspector gets
 * there. 4 of 94 rows with a פיזור note also end on a `bt`; every other row is
 * unambiguous.
 */
function transportAt(
  legs: ParsedLeg[],
  end: 'start' | 'end',
  hasTaxiNote: boolean,
): TransportMode {
  if (hasTaxiNote) return 'TAXI';

  const firstActive = legs.findIndex((l) => l.kind === 'TRAIN' && l.isDuty);
  if (firstActive === -1) return 'NONE';
  let lastActive = -1;
  legs.forEach((l, i) => {
    if (l.kind === 'TRAIN' && l.isDuty) lastActive = i;
  });

  const segment = end === 'start' ? legs.slice(0, firstActive) : legs.slice(lastActive + 1);
  return segment.some((l) => l.kind === 'TRANSIT') ? 'RAIL' : 'NONE';
}

export function parseDuty(row: RosterRowInput, resolver?: StationResolver): ParsedDuty {
  const { tokens, warnings, trailingNote } = tokenizeShiftString(row.shiftString, resolver);
  const routeNote = parseRouteNote(row.routeNote);
  const built = buildLegs(tokens, routeNote);

  const activeTrains = built.legs
    .filter((l) => l.kind === 'TRAIN' && l.isDuty && l.trainNumber)
    .map((l) => l.trainNumber as string);

  const allWarnings = [...warnings];
  if (routeNote?.pickupTo && !routeNote.pickupStation) {
    allWarnings.push({ code: 'UNRESOLVED_STATION', detail: routeNote.pickupTo });
  }
  if (routeNote?.dispersalFrom && !routeNote.dispersalStation) {
    allWarnings.push({ code: 'UNRESOLVED_STATION', detail: routeNote.dispersalFrom });
  }

  let parseStatus: ParseStatus = 'OK';
  if (tokens.length === 0) parseStatus = 'FAILED';
  else if (allWarnings.length > 0) parseStatus = 'PARTIAL';

  return {
    rowIndex: row.rowIndex,
    section: row.section,
    serial: row.serial,
    isReinforcement: isReinforcementSerial(row.serial),
    name: row.name,
    workerNumber: row.workerNumber,
    startMinutes: row.startMinutes,
    endMinutes: row.endMinutes,
    shiftString: row.shiftString,
    routeNote,
    remarks: row.remarks,
    legs: built.legs,
    tokens,
    firstActiveTrain: activeTrains[0] ?? null,
    lastActiveTrain: activeTrains[activeTrains.length - 1] ?? null,
    startStation: built.startStation,
    startSource: built.startSource,
    endStation: built.endStation,
    endSource: built.endSource,
    finalStation: built.finalStation,
    startTransport: transportAt(built.legs, 'start', Boolean(routeNote?.pickupTo)),
    endTransport: transportAt(built.legs, 'end', Boolean(routeNote?.dispersalFrom)),
    templateHash: computeTemplateHash(row.section, row.serial, row.shiftString),
    parseStatus,
    warnings: allWarnings,
    trailingNote,
  };
}
