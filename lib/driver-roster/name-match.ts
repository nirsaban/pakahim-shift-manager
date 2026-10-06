/**
 * Matches the names on the weekly link report to drivers. That report carries
 * no worker number, so a name is all there is - and a wrong match would put a
 * shift on the wrong person's phone. So:
 *
 * 1. Exact, after dropping spaces, quotes, geresh and hyphens.
 * 2. The same words in another order - "שלו יצחק" / "יצחק שלו": the two
 *    reports do not agree on first-name-first.
 * 3. Otherwise a near spelling - at most two letters apart over the whole
 *    name ("אבירם לטמן" / "אבירם לאטמן", "מיכאל קולניץ" / "מיכאל קוליניץ") - but
 *    only when exactly one driver is that close. Two candidates is a guess,
 *    and a guess is reported rather than made.
 *
 * Anything else is left unmatched for the roster admin to fix in the driver
 * list, after which a re-upload picks it up.
 */

export interface NamedDriver {
  id: string;
  name: string;
}

export type NameMatch =
  | { kind: 'exact'; driverId: string }
  | { kind: 'near'; driverId: string; matchedName: string }
  | { kind: 'ambiguous'; candidates: string[] }
  | { kind: 'none' };

const MAX_DISTANCE = 2;
/** Names shorter than this are too short for a two-letter allowance to be safe. */
const MIN_FUZZY_LENGTH = 7;

export function normalizeName(name: string): string {
  return name.replace(/[\s'"`׳״\-.*]/g, '');
}

/** Levenshtein distance, stopping early once it exceeds `limit`. */
function distance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, row[j]);
    }
    if (best > limit) return limit + 1;
    prev = row;
  }
  return prev[b.length];
}

/** The name's words, normalised and sorted - equal for the same name in any order. */
function wordKey(name: string): string {
  return name
    .split(/\s+/)
    .map(normalizeName)
    .filter(Boolean)
    .sort()
    .join(' ');
}

export function matchDriverName(name: string, drivers: NamedDriver[]): NameMatch {
  const wanted = normalizeName(name);
  if (!wanted) return { kind: 'none' };

  const exact = drivers.filter((d) => normalizeName(d.name) === wanted);
  if (exact.length === 1) return { kind: 'exact', driverId: exact[0].id };
  if (exact.length > 1) return { kind: 'ambiguous', candidates: exact.map((d) => d.name) };

  const key = wordKey(name);
  const reordered = drivers.filter((d) => wordKey(d.name) === key);
  if (reordered.length === 1) return { kind: 'near', driverId: reordered[0].id, matchedName: reordered[0].name };
  if (reordered.length > 1) return { kind: 'ambiguous', candidates: reordered.map((d) => d.name) };

  if (wanted.length < MIN_FUZZY_LENGTH) return { kind: 'none' };
  const near = drivers.filter((d) => distance(wanted, normalizeName(d.name), MAX_DISTANCE) <= MAX_DISTANCE);
  if (near.length === 1) return { kind: 'near', driverId: near[0].id, matchedName: near[0].name };
  if (near.length > 1) return { kind: 'ambiguous', candidates: near.map((d) => d.name) };
  return { kind: 'none' };
}
