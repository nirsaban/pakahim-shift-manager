// Splits an uploaded workbook into one roster group per date.
//
// Pure like the rest of lib/roster/: no prisma, no he.ts, no Next runtime, so
// the multi-day grammar can be tested (and run by scripts/verify-roster.ts)
// without a database.

import * as XLSX from 'xlsx';
import { extractRosterRows, parseSheetDates, resolveBlockDate } from './sheet';
import { startOfIsraelDay } from '../time/zone';
import type { RosterRowInput } from './types';

export interface RosterDay {
  date: Date;
  rosterRows: RosterRowInput[];
}

export interface WorkbookScan {
  /** Ascending by date. */
  days: RosterDay[];
  /** Non-blank, non-header lines with no serial or shift string. */
  dropped: number;
  /** Roster rows deliberately left unimported for want of a date. */
  undated: number;
}

/**
 * The department ships multi-day rosters in three shapes, and this handles all:
 * one sheet per day (sheet named `DD.MM.YY`); several dated blocks stacked
 * inside a single sheet, each block header title carrying its own date; and a
 * sheet named for a span (`14.08.26-15.08.26`) whose blocks name their weekday
 * but print a stale date left over from the file they were copied from.
 *
 * A row's own block header wins over the sheet name — it is the more specific
 * statement — but only while it is credible: `resolveBlockDate` drops a printed
 * date that contradicts its own weekday or falls outside the span the sheet name
 * declares, and falls back to the weekday, then the sheet, then the block above.
 *
 * Rows we cannot date are NOT guessed at when the workbook dates anything else.
 * Every import is a destructive replace of its date, so picking the wrong day
 * would silently wipe a real roster — dropping the rows and saying so is the
 * recoverable failure. The one exception preserves the previous behaviour: a
 * workbook that dates nothing at all, anywhere, is taken as today, which is what
 * a single untitled daily file has always meant.
 */
export function groupWorkbookByDate(workbook: XLSX.WorkBook, today: Date = new Date()): WorkbookScan {
  const byDate = new Map<number, RosterDay>();
  const undated: RosterRowInput[] = [];
  let dropped = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
    const roster = extractRosterRows(rawRows, 'כללי');
    // A cover sheet or a stray notes tab is not a roster - not an import error.
    if (roster.rows.length === 0) continue;
    dropped += roster.dropped;

    const sheetDates = parseSheetDates(sheetName);

    // Resolved once per block, in sheet order, so an undated block can continue
    // the one above it.
    const dateByBlock: (Date | null)[] = [];
    let previous: Date | null = null;
    for (const block of roster.blocks) {
      const date = resolveBlockDate(block, sheetDates, previous);
      dateByBlock.push(date);
      if (date) previous = date;
    }

    for (const source of roster.rows) {
      const date = dateByBlock[source.blockIndex] ?? (sheetDates.length === 1 ? sheetDates[0] : null);
      const row = { ...source, sectionDate: date };
      if (!date) {
        undated.push(row);
        continue;
      }
      const key = date.getTime();
      const existing = byDate.get(key);
      if (existing) existing.rosterRows.push(row);
      else byDate.set(key, { date, rosterRows: [row] });
    }
  }

  // Nothing anywhere in the workbook stated a date: the whole file is today.
  if (byDate.size === 0 && undated.length > 0) {
    return { days: [{ date: startOfIsraelDay(today), rosterRows: undated }], dropped, undated: 0 };
  }

  const days = [...byDate.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
  return { days, dropped, undated: undated.length };
}
