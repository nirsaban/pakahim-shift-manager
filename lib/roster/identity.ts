// Duty identity within one roster date.
//
// Pure like the rest of lib/roster/: the rule that decides "these two roster
// lines are the same duty" has to be testable without a database, because it is
// what the Duty table's own uniqueness constraint is built on.

import type { ParsedDuty } from './types';

/** A duty is identified within its date by the block it sits in and its מס״ד. */
export function dutyIdentity(section: string, serial: string): string {
  return `${section}|${serial}`;
}

export interface DedupeResult {
  kept: ParsedDuty[];
  /** Lines dropped because an earlier line already claimed their identity. */
  duplicates: ParsedDuty[];
}

/**
 * Collapse roster lines that claim the same (section, serial) on one date.
 *
 * The database enforces `@@unique([tenantId, date, section, serial])` on `Duty`
 * and `@unique` on `Duty.shiftId`, so a repeated identity is not merely untidy —
 * it aborts the whole date's duty/handoff/swap layer with a P2002 and leaves the
 * day with imported shifts and no parsed roster behind them. That is exactly
 * what happened to a real 138-row single-section file on 2026-06-27.
 *
 * First line wins, because the roster is read top to bottom and the first
 * occurrence is the one a human reading the file would call "מס״ד 17". The
 * dropped lines are returned rather than swallowed so the importer can report
 * them: silently losing a duty is worse than losing the whole day loudly.
 *
 * Run this BEFORE handoff detection and swap generation, not after — those
 * derive from the duty set, and feeding them lines that will never be persisted
 * produces edges pointing at rows that do not exist.
 */
export function dedupeDutiesByIdentity(duties: ParsedDuty[]): DedupeResult {
  const seen = new Set<string>();
  const kept: ParsedDuty[] = [];
  const duplicates: ParsedDuty[] = [];

  for (const duty of duties) {
    const identity = dutyIdentity(duty.section, duty.serial);
    if (seen.has(identity)) {
      duplicates.push(duty);
      continue;
    }
    seen.add(identity);
    kept.push(duty);
  }

  return { kept, duplicates };
}

/**
 * Resolve each duty's Shift id, never handing the same shift to two duties.
 *
 * `Duty.shiftId` is `@unique`, so a double assignment is a hard failure rather
 * than a duplicated row. Deduping identities above should already make this
 * impossible; it is kept as a separate guard because the cost is one Set and the
 * failure mode it prevents costs a whole day's roster layer.
 */
export function assignShiftIds(
  duties: ParsedDuty[],
  shiftIdByKey: Map<string, string> | undefined,
): (string | null)[] {
  const used = new Set<string>();

  return duties.map((duty) => {
    const shiftId = shiftIdByKey?.get(dutyIdentity(duty.section, duty.serial)) ?? null;
    if (!shiftId || used.has(shiftId)) return null;
    used.add(shiftId);
    return shiftId;
  });
}
