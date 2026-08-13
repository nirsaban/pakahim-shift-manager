// Scans a roster worksheet (already converted to an array-of-arrays) into
// RosterRowInput records.
//
// Deliberately does NOT drop rows that lack a name or worker number: 13 rows a
// day carry a real shift string with no inspector assigned. Those are open
// duties — a swap can move someone into one — and the existing importer
// discards them today.

import type { RosterRowInput } from './types';

// The serial column is headed two different ways by the same department, and a
// single workbook mixes both: the 14.08-15.08 weekend file writes `מס"ד` on its
// first block and `מס' סידור` on the three that follow. Missing a header does not
// just lose that row — it loses the whole block's section AND its date, silently
// folding the next day into the previous one.
const HEADER_COL0 = ['מסד', 'מססידור'];
const HEADER_COL1 = 'שם הפקח';

/** Quote marks are written as ", ', ״ and ׳ interchangeably in this source. */
function stripQuotes(value: string): string {
  return value.replace(/["'״׳]/g, '').replace(/\s+/g, '');
}

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
  return (
    HEADER_COL0.includes(stripQuotes(cell(row, COLUMN.serial))) && cell(row, COLUMN.name) === HEADER_COL1
  );
}

/** Section titles read "פקחים דרום ... יום ה' 13.08.26" or "... מוצ"ש לו"ז 27.06.26"
 *  — strip the date and the day-of-week wording so the same section collapses to
 *  one stable name across days. Sections become team names on import, so leaving
 *  "מוצ"ש" on would fork the Saturday-night roster into a team of its own. */
export function cleanSectionName(raw: string): string {
  return raw
    .replace(/\s+\d{1,2}\.\d{1,2}\.\d{2,4}\s*$/, '')
    .replace(/\s+לו["״]?ז\s*$/, '')
    .replace(/\s+יום\s+[אבגדהו]['׳]?\s*$/, '')
    .replace(/\s+יום\s+(?:ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)\s*$/, '')
    .replace(/\s+מוצ["״]?ש\s*$/, '')
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
 * The day of week a block title names, 0=Sunday..6=Saturday, or null.
 *
 * This is what rescues a block whose printed date is stale: the department
 * copies last cycle's file and updates the sheet name, so "יום ו' 27.06.26" can
 * sit on top of the 14.08 roster. The weekday wording is part of what they
 * actually retype, and it can be checked against the file's own date span.
 *
 * מוצ"ש (Saturday night) is Saturday: those shifts start ~20:30 on Saturday and
 * run past midnight, which the importer already rolls forward on its own.
 */
export function parseWeekday(title: string): number | null {
  if (/מוצ["״׳']?\s?ש/.test(title)) return 6;

  const letter = title.match(/יום\s+([אבגדהו])\s*['׳"״]?/);
  if (letter) return 'אבגדהו'.indexOf(letter[1]);

  const words = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const word = title.match(new RegExp(`יום\\s+(${words.join('|')})`));
  if (word) return words.indexOf(word[1]);
  if (/(^|\s)שבת(\s|$)/.test(title)) return 6;

  return null;
}

const DATE_PATTERN = String.raw`(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?`;
const SHEET_SINGLE = new RegExp(`^${DATE_PATTERN}$`);
const SHEET_RANGE = new RegExp(`^${DATE_PATTERN}\\s*[-–—]\\s*${DATE_PATTERN}$`);
/** A sheet name spanning more days than this is a misread, not a roster. */
const MAX_SPAN_DAYS = 31;

function validDate(dd: string, mm: string, yy: string | undefined): Date | null {
  if (!yy) return null;
  if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) return null;
  return toRosterDate(dd, mm, yy);
}

/**
 * Every date a sheet name claims. `13.08.26` is one; `14.08.26-15.08.26` — how
 * the department names a weekend file — is the whole inclusive span.
 *
 * Returned as an expanded list rather than a pair because that is what the two
 * callers want: "does the block's printed date fall inside the file at all", and
 * "which day in this file is the Friday".
 */
export function parseSheetDates(sheetName: string): Date[] {
  const name = sheetName.trim();

  const single = name.match(SHEET_SINGLE);
  if (single) {
    const date = validDate(single[1], single[2], single[3]);
    return date ? [date] : [];
  }

  const range = name.match(SHEET_RANGE);
  if (!range) return [];
  // "14.08-15.08.26" states the year once, at the end.
  const end = validDate(range[4], range[5], range[6]);
  const start = validDate(range[1], range[2], range[3] ?? range[6]);
  if (!start || !end || end < start) return [];

  const dates: Date[] = [];
  for (const day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    if (dates.length >= MAX_SPAN_DAYS) return [];
    dates.push(new Date(day));
  }
  return dates;
}

/**
 * The date a block's rows belong to, given what the block title says and what
 * the sheet name covers.
 *
 * The ordering encodes which signal survived contact with the real files:
 *
 *  1. A printed date is used as-is — unless it contradicts its own weekday
 *     wording, or falls outside a span the sheet name explicitly declares.
 *     Either makes it a leftover from the file this one was copied from.
 *  2. Otherwise the weekday wording picks the matching day out of the sheet's
 *     span — the signal that dates a weekend file whose blocks print June.
 *  3. A single-date sheet name dates everything in it, as it always has.
 *  4. Inside a dated span, a block that states nothing at all (the `פקחים ב"ש`
 *     ones carry no date and no weekday) continues the block above it. Bounded
 *     by the span, so this cannot land on a day the file does not cover — and
 *     deliberately not extended to a block whose printed date we just rejected:
 *     there the file is contradicting itself, and silently merging it into the
 *     previous day would destructively overwrite a real roster. That block goes
 *     back undated, for the admin to be told about.
 */
export function resolveBlockDate(
  block: { titleDate: Date | null; weekday: number | null },
  sheetDates: Date[],
  previousDate: Date | null,
): Date | null {
  const { titleDate, weekday } = block;

  if (titleDate) {
    const contradictsWeekday = weekday !== null && titleDate.getDay() !== weekday;
    const outsideSheetSpan =
      sheetDates.length > 1 && !sheetDates.some((d) => d.getTime() === titleDate.getTime());
    if (!contradictsWeekday && !outsideSheetSpan) return titleDate;
  }

  if (weekday !== null) {
    const match = sheetDates.find((d) => d.getDay() === weekday);
    if (match) return match;
  }

  if (sheetDates.length === 1) return sheetDates[0];
  if (sheetDates.length > 1 && previousDate && titleDate === null) return previousDate;

  return null;
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

/** The first roster date a sheet name states, e.g. "13.08.26" -> 2026-08-13. */
export function parseSheetDate(sheetName: string): Date | null {
  return parseSheetDates(sheetName)[0] ?? null;
}

/** One block header and everything under it, up to the next header. */
export interface RosterBlock {
  /** Row the header sits on. A row belongs to the last block starting at or above it. */
  rowIndex: number;
  section: string;
  /** The date the title itself prints, which may be stale — see resolveBlockDate. */
  titleDate: Date | null;
  weekday: number | null;
}

export interface ExtractResult {
  rows: RosterRowInput[];
  sections: string[];
  /** In sheet order. Empty when the sheet opens straight into rows. */
  blocks: RosterBlock[];
  /** Non-blank, non-header rows with no serial or no shift string. */
  dropped: number;
}

export function extractRosterRows(rawRows: unknown[][], fallbackSection = 'כללי'): ExtractResult {
  const rows: RosterRowInput[] = [];
  const sections: string[] = [];
  const blocks: RosterBlock[] = [];
  let dropped = 0;
  let currentSection = fallbackSection;
  let currentSectionDate: Date | null = null;
  let currentBlock = -1;

  rawRows.forEach((row, rowIndex) => {
    if (isBlankRow(row)) return;

    if (isBlockHeader(row)) {
      const title = cell(row, COLUMN.routeNote);
      currentSection = title ? cleanSectionName(title) : fallbackSection;
      currentSectionDate = title ? parseSectionDate(title) : null;
      if (!sections.includes(currentSection)) sections.push(currentSection);
      currentBlock = blocks.length;
      blocks.push({
        rowIndex,
        section: currentSection,
        titleDate: currentSectionDate,
        weekday: title ? parseWeekday(title) : null,
      });
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
      blockIndex: currentBlock,
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

  return { rows, sections, blocks, dropped };
}
