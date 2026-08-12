// Parser for column 9 of the roster — the Hebrew route note.
//
// This turns out to be a BETTER geographic signal than the shift string: it
// names the duty's start and end station in plain Hebrew, it is present on 159
// of 255 rows, and it is more stable day-to-day than the code itself. Measured
// on the real file: 65 distinct values, all 65 covered by the three productions
// below, zero unparsed.
//
//   איסוף ל<X>                → duty starts at X
//   פיזור מ<X>                → duty ends at X
//   איסוף ופיזור מ/אל <X>     → both
//   (the first two combine: "איסוף ל<X> ופיזור מ<Y>")

import { resolveStation } from '../reference/stations';
import type { ParsedRouteNote } from './types';

/** Expand the abbreviations the schedulers type, so place names match the dictionary. */
export function normalizeHebrewPlace(raw: string): string {
  return raw
    .replace(/ת["״']א/g, 'תל אביב')
    .replace(/ב["״']ש/g, 'באר שבע')
    .replace(/ראשל["״']צ/g, 'ראשון לציון')
    .replace(/["״']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * `מתחם` (depot) and `אוטם` (yard move) are operational qualifiers, not part of
 * the station name — strip them so "מתחם אשקלון" and "אשקלון" resolve alike.
 */
function stripQualifiers(place: string): string {
  return place
    .replace(/^אוטם\s+/, '')
    .replace(/^מתחם\s+/, '')
    .replace(/\s+מתחם$/, '')
    .trim();
}

export function parseRouteNote(raw: string): ParsedRouteNote | null {
  const original = String(raw ?? '').trim();
  if (!original) return null;

  const text = normalizeHebrewPlace(original);

  let pickupTo: string | null = null;
  let dispersalFrom: string | null = null;

  // 1. Combined form covers both endpoints with one place.
  const both = text.match(/^איסוף ופיזור מ\/?אל\s+(.+)$/);
  if (both) {
    pickupTo = stripQualifiers(both[1]);
    dispersalFrom = pickupTo;
  } else {
    // 2. "איסוף ל<X>", stopping before a trailing "ופיזור ...".
    const pickup = text.match(/איסוף\s+ל(.+?)(?=\s+ופיזור|$)/);
    if (pickup) pickupTo = stripQualifiers(pickup[1]);

    // 3. "פיזור מ<Y>" — always the tail of the note.
    const dispersal = text.match(/פיזור\s+מ(.+)$/);
    if (dispersal) dispersalFrom = stripQualifiers(dispersal[1]);
  }

  if (pickupTo === null && dispersalFrom === null) return null;

  return {
    pickupTo,
    dispersalFrom,
    pickupStation: pickupTo ? (resolveStation(pickupTo)?.code ?? null) : null,
    dispersalStation: dispersalFrom ? (resolveStation(dispersalFrom)?.code ?? null) : null,
    raw: original,
  };
}
