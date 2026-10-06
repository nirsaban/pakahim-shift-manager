import { he } from '../he';
import { stripBidiMarks, type PdfTextItem } from './pdf';
import { trainNumbersIn } from './roster';
import { NOT_A_STATION } from './handoffs';

/**
 * Parses the drivers' weekly link report - "דוח לינק יומי ושבועי", a landscape
 * table with one row per driver (their link, "D01") and one column per day of
 * the week. See docs/modules/drivers.md.
 *
 * - **Day columns** come from the header: each is a weekday letter beside a
 *   date, and a column runs to halfway to its neighbours.
 * - **A row** begins at its link code and owns everything down to the next one.
 * - **A cell** is a day off ("מנוחה"), empty, or work: task lines, then the
 *   hours in parentheses, "(04:20 11:05)", start first. The hours may wrap or
 *   be glued, "(22:2504:35)".
 *
 * Task lines read left to right in time order, as in the daily report. A
 * Hebrew run such as "251 בנימינה" is one text item whose words are in logical
 * (right-to-left) order, so its words are reversed to get them left to right.
 * The task is stored in the daily report's form - right to left, steps joined
 * by " - " - so display, train numbers and handoffs treat both reports alike.
 */

export interface WeeklyRosterCell {
  /** Index into `days`. */
  day: number;
  startMinutes: number;
  /** Below startMinutes when the shift ends after midnight. */
  endMinutes: number;
  /** In the daily report's stored form. */
  task: string;
  trainNumbers: string[];
  /** First station the work starts from, read off the task. */
  originStation: string | null;
}

export interface WeeklyRosterRow {
  link: string;
  workerName: string;
  /** Days off ("מנוחה"), by index into `days`. */
  restDays: number[];
  shifts: WeeklyRosterCell[];
  page: number;
}

export interface WeeklyRosterParse {
  days: { year: number; month: number; day: number }[];
  section: string | null;
  rows: WeeklyRosterRow[];
  /** Problems with the file, in Hebrew: the roster admin reads them under the preview. */
  warnings: string[];
}

type Item = Pick<PdfTextItem, 'str' | 'x' | 'y' | 'width' | 'dir'>;

const TITLE = 'דוח לינק';
const DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
// "D01", and a second series printed with a Hebrew ד: "ד01" (or "01ד" once reordered).
const LINK = /^(?:[Dד]\d{1,3}|\d{1,3}ד)$/;
const REST = 'מנוחה';
const PASSENGER = 'בת';
const TIME = /(\d{1,2}):(\d{2})/g;
/** A word carrying the hours: a clock time with a parenthesis, "(10:50", "18:20)", "(22:2504:35)". */
const HOURS_WORD = /[()].*\d{1,2}:\d{2}|\d{1,2}:\d{2}.*[()]/;
/** Pieces whose baselines differ by less than this are one line. */
const SAME_LINE = 3;

const clean = (s: string) => stripBidiMarks(s).replace(/\s+/g, ' ').trim();
const center = (i: Item) => i.x + i.width / 2;

/** Whether a page's text is the weekly link report. */
export function isWeeklyLinkReport(pages: Item[][]): boolean {
  return (pages[0] ?? []).some((i) => clean(i.str).includes(TITLE));
}

interface Columns {
  days: { from: number; to: number; date: WeeklyRosterParse['days'][number] }[];
  /** Left edge of the name column; the link column starts at `linkFrom`. */
  nameFrom: number;
  linkFrom: number;
  headerBottom: number;
}

function readColumns(items: Item[]): Columns | null {
  const dates = items
    .map((i) => ({ item: i, m: clean(i.str).match(DATE) }))
    .filter((d): d is { item: Item; m: RegExpMatchArray } => Boolean(d.m));
  // The header's dates sit on one line; the print date at the top is alone.
  const headerY = mostCommon(dates.map((d) => Math.round(d.item.y)));
  const header = dates.filter((d) => Math.abs(d.item.y - headerY) < SAME_LINE).sort((a, b) => a.item.x - b.item.x);
  if (header.length < 7) return null;
  const headerBottom = Math.min(...header.map((d) => d.item.y)) - SAME_LINE;

  const nameHeader = items.find((i) => clean(i.str) === 'שם עובד');
  const linkHeader = items.find((i) => clean(i.str) === 'לינק');
  if (!nameHeader || !linkHeader) return null;

  // Where each column starts. The headings are centred unevenly, so they only
  // say roughly where; the cells say exactly, because their text is set flush
  // against the column's left border. So: the most common left edge of body
  // text a little left of each heading.
  const leftEdges = items.filter((i) => i.y < headerBottom).map((i) => Math.round(i.x));
  const starts = header.map((d, n) => {
    if (n === 0) return -Infinity;
    const near = leftEdges.filter((x) => x > d.item.x - 60 && x < d.item.x - 25);
    return near.length > 0 ? mostCommon(near) - 1 : (header[n - 1].item.x + header[n - 1].item.width + d.item.x) / 2;
  });
  const nameFrom = (header[header.length - 1].item.x + header[header.length - 1].item.width + nameHeader.x) / 2;
  const linkFrom = (nameHeader.x + nameHeader.width + linkHeader.x) / 2;
  const days = header.map((d, n) => ({
    from: starts[n],
    to: n === header.length - 1 ? nameFrom : starts[n + 1],
    date: { day: +d.m[1], month: +d.m[2], year: +d.m[3] },
  }));
  // Right to left on the page is earliest first; keep them in calendar order.
  days.reverse();
  return { days, nameFrom, linkFrom, headerBottom };
}

function mostCommon(values: number[]): number {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
}

/** Items as lines, top to bottom. */
function lines(items: Item[]): Item[][] {
  const out: { y: number; items: Item[] }[] = [];
  for (const item of [...items].sort((a, b) => b.y - a.y)) {
    const line = out.find((l) => Math.abs(l.y - item.y) < SAME_LINE);
    if (line) line.items.push(item);
    else out.push({ y: item.y, items: [item] });
  }
  return out.map((l) => l.items);
}

/** A line's words, left to right on the page - which is time order. */
function wordsLeftToRight(line: Item[]): string[] {
  return [...line]
    .sort((a, b) => a.x - b.x)
    .flatMap((i) => {
      const words = clean(i.str).split(' ').filter(Boolean);
      return i.dir === 'rtl' ? words.reverse() : words;
    });
}

/** One time-ordered line in the daily report's stored form: right to left, " - " between steps, "N בת" kept together. */
function storedLine(words: string[]): string {
  const rtl = [...words].reverse();
  return rtl.map((w, i) => (i === 0 ? w : w === PASSENGER ? ` ${w}` : ` - ${w}`)).join('');
}

/** Standby and the like: words of a cell that are not where work starts. */
const NOT_AN_ORIGIN = new Set(['מוכן', 'חשמלי', 'ערב', 'בוקר', 'צהרים', 'לילה', 'קטר', 'מתחם']);

/** The first station named, e.g. "הגנה" in "מונית → הגנה → 7614"; "מתחם אשקלון" keeps its yard. */
function firstStation(words: string[]): string | null {
  const isPlace = (w: string) =>
    !/\d/.test(w) && w !== PASSENGER && !NOT_A_STATION.has(w) && !NOT_AN_ORIGIN.has(w) && !/^[A-Za-z]/.test(w);
  const at = words.findIndex(isPlace);
  if (at < 0) return null;
  return words[at - 1] === 'מתחם' ? `מתחם ${words[at]}` : words[at];
}

function readCell(items: Item[], day: number): { rest: boolean; shift: WeeklyRosterCell | null; problem: string | null } {
  const cellLines = lines(items).map(wordsLeftToRight).filter((w) => w.length > 0);
  if (cellLines.length === 0) return { rest: false, shift: null, problem: null };
  const all = cellLines.flat();
  if (all.length === 1 && all[0] === REST) return { rest: true, shift: null, problem: null };

  // The hours: every clock time in parentheses, wherever it wrapped to.
  const hours = all.filter((w) => HOURS_WORD.test(w)).join(' ');
  const times = [...hours.matchAll(TIME)].map((m) => Number(m[1]) * 60 + Number(m[2]));
  if (times.length < 2) return { rest: false, shift: null, problem: 'no_hours' };

  const taskLines = cellLines.map((words) => words.filter((w) => !HOURS_WORD.test(w))).filter((words) => words.length > 0);
  const task = taskLines.map(storedLine).join(' ');
  return {
    rest: false,
    problem: null,
    shift: {
      day,
      startMinutes: times[0],
      endMinutes: times[times.length - 1],
      task,
      trainNumbers: trainNumbersIn(task),
      originStation: firstStation(taskLines.flat()),
    },
  };
}

export function parseWeeklyRoster(pages: Item[][]): WeeklyRosterParse {
  const warnings: string[] = [];
  const rows: WeeklyRosterRow[] = [];
  let days: WeeklyRosterParse['days'] = [];
  let section: string | null = null;

  pages.forEach((pageItems, index) => {
    const page = index + 1;
    const items = pageItems.filter((i) => clean(i.str));
    const columns = readColumns(items);
    if (!columns) {
      warnings.push(he.drivers.upload.warning.noDayHeader(page));
      return;
    }
    if (days.length === 0) days = columns.days.map((d) => d.date);
    section ??= items.map((i) => clean(i.str)).find((t) => t.endsWith('נהגים')) ?? null;

    const body = items.filter((i) => i.y < columns.headerBottom);
    const links = body.filter((i) => i.x >= columns.linkFrom && LINK.test(clean(i.str))).sort((a, b) => b.y - a.y);
    // Below the last row is the page number.
    const bottom = Math.min(...body.map((i) => i.y));

    links.forEach((link, n) => {
      const next = links[n + 1];
      const rowItems = body.filter(
        (i) => i !== link && i.y <= link.y + SAME_LINE && (next ? i.y > next.y + SAME_LINE : i.y > bottom + SAME_LINE || i.y > 40),
      );
      const nameItems = rowItems.filter((i) => center(i) >= columns.nameFrom && center(i) < columns.linkFrom);
      const workerName = lines(nameItems)
        .map((l) => l.map((i) => clean(i.str)).join(' '))
        .join(' ')
        .replace(/\*/g, '')
        .trim();

      const row: WeeklyRosterRow = { link: clean(link.str), workerName, restDays: [], shifts: [], page };
      columns.days.forEach((col, day) => {
        // By left edge: cell text is set flush against the column's left border.
        const cellItems = rowItems.filter((i) => i.x >= col.from && i.x < col.to && center(i) < columns.nameFrom);
        const cell = readCell(cellItems, day);
        if (cell.rest) row.restDays.push(day);
        if (cell.shift) row.shifts.push(cell.shift);
        if (cell.problem) {
          const d = col.date;
          warnings.push(he.drivers.upload.warning.noHours(row.link, workerName, `${d.day}/${d.month}`));
        }
      });
      if (!workerName) warnings.push(he.drivers.upload.warning.linkWithoutName(page, row.link));
      rows.push(row);
    });
  });

  return { days, section, rows, warnings };
}
