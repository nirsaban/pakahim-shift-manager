// Station code -> Hebrew name, with no server dependencies.
//
// This lived in worker-shift-service, which imports prisma - fine for a server
// component, fatal for the commander board, which renders station names in the
// browser as the time slider moves. Same lookup, importable from either side.

import { resolveStation } from './stations';

/** The Hebrew name for a station code; the code itself when it is unrecognised,
 *  and null for no code at all - "unknown station" is the caller's word to choose. */
export function stationNameHe(code: string | null | undefined): string | null {
  if (!code) return null;
  return resolveStation(code)?.nameHe ?? code;
}
