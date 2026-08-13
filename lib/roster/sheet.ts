// Scans a roster worksheet (already converted to an array-of-arrays) into
// RosterRowInput records.
//
// Deliberately does NOT drop rows that lack a name or worker number: 13 rows a
// day carry a real shift string with no inspector assigned. Those are open
// duties — a swap can move someone into one — and the existing importer
// discards them today.

import type { RosterRowInput } from './types';

const HEADER_COL0 = 'מס"ד';
const HEADER_COL1 = 'שם הפקח';

export const COLUMN = {
  serial: 0,
  name: 1,
  mirs: 2,
  workerNumber: 3,
  traineeName: 4,
  traineeMirs: 5,
  traineeWorkerNumber: 6,
  startTime: 7,
  endTime: 8,
  routeNote: 9,
  shiftString: 10,
  remarks: 11,
} as const;

function cell(row: unknown[], index: number): string {
  const value = row[index];
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function isBlankRow(row: unknown[]): boolean {
  return row.every((c) => c === '' || c === undefined || c === null);
}

function isBlockHeader(row: unknown[]): boolean {
  return cell(row, COLUMN.serial) === HEADER_COL0 && cell(row, COLUMN.name) === HEADER_COL1;
}

/** Section titles read "פקחים דרום ... יום ה' 13.08.26" — strip the day+date so
 *  the same section collapses to one stable name across days. The date is also
 *  stripped on its own, because a multi-day workbook stacks blocks for several
 *  dates in one sheet and not every title spells the weekday out. */
export function cleanSectionName(raw: string): string {
  return raw
    .replace(/\s+יום\s+\S+\s+\d{1,2}\.\d{1,2}\.\d{2,4}\s*$/, '')
    .replace(/\s+\d{1,2}\.\d{1,2}\.\d{2,4}\s*$/, '')
    .trim();
}

function toRosterDate(dd: string, mm: string, yy: string): Date {
  const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
  const date = new Date(year, Number(mm) - 1, Number(dd));
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * The date a block header claims, e.g. "פקחים דרום יום ה' 13.08.26" -> 2026-08-13.
 *
 * This is the only per-day signal a multi-day workbook has when the whole
 * roster sits in ONE sheet: every block repeats its own header, and the header
 * carries the date. Searched anywhere in the title rather than anchored, since
 * the department writes it both mid-title and trailing.
 */
export function parseSectionDate(title: string): Date | null {
  const match = title.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (!match) return null;
  const [, dd, mm, yy] = match;
  if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) return null;
  return toRosterDate(dd, mm, yy);
}

/**
 * Times are inconsistent in the source: some are "HH:MM" strings, some are Excel
 * time-serials that xlsx (cellDates:true) turns into Dates anchored at
 * 1899-12-30.
 *
 * Read those with LOCAL getters, not UTC. SheetJS builds the Date with
 * wall-clock semantics, so under TZ=Asia/Jerusalem the 1899 LMT offset
 * (+02:21:20) makes the UTC getters wrong by 2h21m. Measured on the real file:
 * 395 of 510 time cells are Date-typed, and against the same cells read as
 * formatted strings the local getters are right 395/395 while the UTC getters
 * are right 0/395. They agree only when TZ=UTC, which is why this survived.
 */
export function timeOfDayMinutes(value: unknown): number | null {
  if (value instanceof Date) {
    return value.getHours() * 60 + value.getMinutes();
  }
  if (typeof value === 'string') {
    const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  }
  return null;
}

/** The roster date is the sheet name, e.g. "13.08.26" -> 2026-08-13. */
export function parseSheetDate(sheetName: string): Date | null {
  const match = sheetName.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (!match) return null;
  const [, dd, mm, yy] = match;
  return toRosterDate(dd, mm, yy);
}

export interface ExtractResult {
  rows: RosterRowInput[];
  sections: string[];
  /** Non-blank, non-header rows with no serial or no shift string. */
  dropped: number;
}

export function extractRosterRows(rawRows: unknown[][], fallbackSection = 'כללי'): ExtractResult {
  const rows: RosterRowInput[] = [];
  const sections: string[] = [];
  let dropped = 0;
  let currentSection = fallbackSection;
  let currentSectionDate: Date | null = null;

  rawRows.forEach((row, rowIndex) => {
    if (isBlankRow(row)) return;

    if (isBlockHeader(row)) {
      const title = cell(row, COLUMN.routeNote);
      currentSection = title ? cleanSectionName(title) : fallbackSection;
      currentSectionDate = title ? parseSectionDate(title) : null;
      if (!sections.includes(currentSection)) sections.push(currentSection);
      return;
    }

    const serial = cell(row, COLUMN.serial);
    const shiftString = cell(row, COLUMN.shiftString);
    // A duty needs an identity and a route. Everything else may be missing —
    // notably the inspector, since ~13 rows a day are unassigned open duties.
    if (!serial || !shiftString) {
      dropped += 1;
      return;
    }

    rows.push({
      rowIndex,
      section: currentSection,
      sectionDate: currentSectionDate,
      serial,
      name: cell(row, COLUMN.name),
      workerNumber: cell(row, COLUMN.workerNumber),
      mirs: cell(row, COLUMN.mirs),
      traineeName: cell(row, COLUMN.traineeName),
      startMinutes: timeOfDayMinutes(row[COLUMN.startTime]),
      endMinutes: timeOfDayMinutes(row[COLUMN.endTime]),
      routeNote: cell(row, COLUMN.routeNote),
      shiftString,
      remarks: cell(row, COLUMN.remarks),
    });
  });

  return { rows, sections, dropped };
}
