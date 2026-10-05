import { he } from '../he';
import { stripBidiMarks, type PdfTextItem } from './pdf';

/**
 * Parses the locomotive drivers' daily roster - "דוח סידור עבודה יומי", a
 * Crystal Reports export printed to PDF. See docs/modules/drivers.md.
 *
 * The report is a table drawn as loose text, so rows and columns are rebuilt
 * from positions:
 *
 * - **Columns** are fixed x-bands on the A4 page, read right to left: name and
 *   worker numbers, Mirs, #, the task, origin station, planned end, start.
 * - **A row** begins at its start time (the leftmost column) and owns
 *   everything down to the next row's start time. A row is several lines tall:
 *   the name above the worker number, a trainee under that, and a long task
 *   wrapped onto further lines.
 * - **A task that runs past the bottom of a page** continues at the top of the
 *   next page, above that page's first start time.
 *
 * Only the south section is kept (scope decision 2026-10-05); every other
 * section is reported as skipped. The yellow highlight and the `*` on some
 * names carry no meaning and are dropped.
 */

export interface DriverCompanion {
  /** "חונך" or "צופה", as printed. */
  role: string;
  name: string;
  workerNumber: string | null;
}

export interface DriverRosterRow {
  serial: number;
  /** Minutes after midnight, Israel time. */
  startMinutes: number;
  /** Minutes after midnight; below startMinutes when the shift ends after midnight. */
  endMinutes: number;
  originStation: string | null;
  /** The משימה column, read right to left, as printed. */
  task: string;
  /** Plain train numbers in the task, in order, without repeats. */
  trainNumbers: string[];
  mirs: string | null;
  companionMirs: string | null;
  workerName: string;
  workerNumber: string | null;
  companion: DriverCompanion | null;
  page: number;
}

export interface DriverRosterParse {
  /** The report date; null if no page states one. */
  date: { year: number; month: number; day: number } | null;
  rows: DriverRosterRow[];
  /** Other sections found in the file and left out, e.g. "צפון נהגים". */
  skippedSections: string[];
  /** Problems with the file, in Hebrew: the roster admin reads them under the preview. */
  warnings: string[];
}

export const SOUTH_SECTION = 'דרום נהגים';

// Column bands in PDF points (x of an item's left edge), measured on the
// 01.10.2026 report. Boundaries sit in the gaps between columns. The name
// column is the exception, see columnOf.
const COLUMN = {
  start: [0, 33],
  end: [33, 68],
  origin: [68, 108],
  task: [108, 440],
  serial: [440, 458],
  mirs: [458, 500],
  name: [500, Infinity],
} as const;
type Column = keyof typeof COLUMN;

/** Everything above this is the page header: title, date, section, column labels. */
const BODY_TOP = 740;
/** Everything below this is the page footer: department contact line, "1 of 15". */
const BODY_BOTTOM = 65;
/** Pieces whose baselines differ by less than this are one line. */
const SAME_LINE = 3;

const TIME = /^(\d{1,2}):(\d{2})$/;
const WORKER_NUMBER = /^\d{5,7}$/;
const COMPANION = /^(חונך|צופה)\s*(.*)$/;
const REPORT_DATE = /(\d{2})\/(\d{2})\/(\d{4})/;

type Item = Pick<PdfTextItem, 'str' | 'x' | 'y' | 'width'>;

/**
 * Names are right-aligned, so a long one ("קוסטיה אייכנבאום") starts left of
 * the name column's edge. They are told apart from Mirs by their right edge
 * instead: no Mirs number reaches it.
 */
const NAME_RIGHT_EDGE = 505;

interface Line {
  y: number;
  text: string;
}

function clean(text: string): string {
  return stripBidiMarks(text).replace(/\s+/g, ' ').trim();
}

function columnOf(item: Item): Column {
  if (item.x + item.width >= NAME_RIGHT_EDGE) return 'name';
  for (const [name, [from, to]] of Object.entries(COLUMN)) {
    if (item.x >= from && item.x < to) return name as Column;
  }
  return 'name';
}

/** Items as lines, top to bottom, each read right to left. */
function toLines(items: Item[]): Line[] {
  const lines: { y: number; items: Item[] }[] = [];
  for (const item of [...items].sort((a, b) => b.y - a.y)) {
    const line = lines.find((l) => Math.abs(l.y - item.y) < SAME_LINE);
    if (line) line.items.push(item);
    else lines.push({ y: item.y, items: [item] });
  }
  return lines.map((l) => ({
    y: l.y,
    text: clean(l.items.sort((a, b) => b.x - a.x).map((i) => i.str).join(' ')),
  }));
}

function toMinutes(text: string): number | null {
  const m = clean(text).match(TIME);
  if (!m) return null;
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  return Number(m[1]) < 24 && Number(m[2]) < 60 ? minutes : null;
}

/**
 * An origin station wrapped over two or three lines. Underscores and hyphens -
 * both appear for the same station - stand for spaces, and the report breaks
 * lines in one of three ways:
 * - at a space, which it drops: "אוטם" / "סבידור";
 * - at an underscore, which stays on a piece's edge: "_מתחם" / "אשקלון" (the
 *   underscore lands on the wrong side after bidi reordering);
 * - inside a word, when the name has no break point: "ראש_הע" / "ין_צפון".
 * Only the last is joined without a space.
 */
function joinOrigin(lines: string[]): string | null {
  let joined = '';
  for (const piece of lines) {
    const atSeparator = /^[_-]|[_-]$/.test(piece) || /^[_-]|[_-]$/.test(joined);
    const midWord = !atSeparator && (/[_-]/.test(piece) || /[_-]/.test(joined));
    joined = joined ? `${joined}${midWord ? '' : ' '}${piece}` : piece;
  }
  const station = joined.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return station || null;
}

/** Standalone numbers in a task - train numbers - ignoring times and tagged tokens like "233בת". */
export function trainNumbersIn(task: string): string[] {
  const numbers: string[] = [];
  for (const token of task.split(/[\s-]+/)) {
    const bare = token.replace(/[()]/g, '');
    if (/^\d{1,5}$/.test(bare) && !numbers.includes(bare)) numbers.push(bare);
  }
  return numbers;
}

interface PageInfo {
  section: string | null;
  date: DriverRosterParse['date'];
}

function readPageHeader(items: Item[]): PageInfo {
  const header = items.filter((i) => i.y > BODY_TOP).map((i) => clean(i.str));
  // The section is its own item beside the "מחלקה:" label.
  const section = header.find((t) => t.endsWith('נהגים')) ?? null;
  // "01/10/2026 :תאריך". The production stamp ("30/09/2026 14:43") is a separate
  // item from its "תאריך הפקה:" label, so requiring both parts in one item skips it.
  const m = header.find((t) => t.includes('תאריך') && REPORT_DATE.test(t))?.match(REPORT_DATE);
  return {
    section,
    date: m ? { day: Number(m[1]), month: Number(m[2]), year: Number(m[3]) } : null,
  };
}

/** A row's items, gathered before they are read. */
interface RawRow {
  page: number;
  y: number;
  start: Item;
  items: Item[];
}

export function parseDriverRoster(pages: Item[][]): DriverRosterParse {
  const warnings: string[] = [];
  const skipped = new Set<string>();
  const rawRows: RawRow[] = [];
  let date: DriverRosterParse['date'] = null;
  // The previous page's last row, while it is in the section being kept.
  let open: RawRow | null = null;

  pages.forEach((items, index) => {
    const page = index + 1;
    const info = readPageHeader(items);

    if (info.date) {
      if (date && (date.day !== info.date.day || date.month !== info.date.month || date.year !== info.date.year)) {
        warnings.push(he.drivers.upload.warning.otherDate(page, `${info.date.day}/${info.date.month}/${info.date.year}`));
      } else date ??= info.date;
    }

    if (info.section !== SOUTH_SECTION) {
      skipped.add(info.section ?? `page ${page} (no section)`);
      open = null;
      return;
    }

    const body = items.filter((i) => i.y <= BODY_TOP && i.y > BODY_BOTTOM && clean(i.str));
    const starts = body
      .filter((i) => columnOf(i) === 'start' && toMinutes(i.str) !== null)
      .sort((a, b) => b.y - a.y);

    // Above the first start time: the tail of the previous page's last row.
    const firstStartY = starts[0]?.y ?? -Infinity;
    const carried = body.filter((i) => i.y > firstStartY + SAME_LINE);
    if (carried.length > 0) {
      if (open) open.items.push(...carried.map((i) => ({ ...i, y: i.y - 10_000 })));
      else warnings.push(he.drivers.upload.warning.orphanText(page));
    }

    starts.forEach((start, n) => {
      const next = starts[n + 1];
      const row: RawRow = {
        page,
        y: start.y,
        start,
        items: body.filter(
          (i) => i !== start && i.y <= start.y + SAME_LINE && (!next || i.y > next.y + SAME_LINE),
        ),
      };
      rawRows.push(row);
      open = row;
    });
  });

  const rows: DriverRosterRow[] = [];
  for (const raw of rawRows) {
    const row = readRow(raw, warnings);
    if (row) rows.push(row);
  }

  const serials = new Set<number>();
  for (const row of rows) {
    if (serials.has(row.serial)) warnings.push(he.drivers.upload.warning.duplicateSerial(row.serial));
    serials.add(row.serial);
  }

  return { date, rows, skippedSections: [...skipped], warnings };
}

function readRow(raw: RawRow, warnings: string[]): DriverRosterRow | null {
  const where = he.drivers.upload.warning.rowAt(raw.page, clean(raw.start.str));
  const byColumn = (column: Column) => raw.items.filter((i) => columnOf(i) === column);
  const lines = (column: Column) => toLines(byColumn(column)).map((l) => l.text).filter(Boolean);

  const startMinutes = toMinutes(raw.start.str)!;
  const endMinutes = toMinutes(lines('end')[0] ?? '');
  if (endMinutes === null) {
    warnings.push(he.drivers.upload.warning.noEndTime(where));
    return null;
  }

  const serialText = lines('serial')[0];
  const serial = serialText && /^\d+$/.test(serialText) ? Number(serialText) : NaN;
  if (Number.isNaN(serial)) {
    warnings.push(he.drivers.upload.warning.noSerial(where));
    return null;
  }

  const person = readPerson(lines('name'));
  if (!person.workerName) {
    warnings.push(he.drivers.upload.warning.noName(`${where} (#${serial})`));
    return null;
  }
  if (!person.workerNumber) warnings.push(he.drivers.upload.warning.noWorkerNumber(`${where} (#${serial})`, person.workerName));

  const mirs = lines('mirs').flatMap((l) => l.split(' ')).filter((t) => /^\d+$/.test(t));
  const task = lines('task').join(' ');

  return {
    serial,
    startMinutes,
    endMinutes,
    originStation: joinOrigin(lines('origin')),
    task,
    trainNumbers: trainNumbersIn(task),
    mirs: mirs[0] ?? null,
    // The second Mirs belongs to the trainee or observer when there is one.
    companionMirs: person.companion ? (mirs[1] ?? null) : null,
    workerName: person.workerName,
    workerNumber: person.workerNumber,
    companion: person.companion,
    page: raw.page,
  };
}

/**
 * The name column, top to bottom: the driver's name (possibly over two lines),
 * their worker number, then optionally "חונך …" / "צופה …" with a name that may
 * wrap and that person's worker number.
 */
function readPerson(lines: string[]): Pick<DriverRosterRow, 'workerName' | 'workerNumber' | 'companion'> {
  const nameParts: string[] = [];
  let workerNumber: string | null = null;
  let companion: DriverCompanion | null = null;

  for (const line of lines) {
    const text = line.replace(/\*/g, '').trim();
    if (!text) continue;
    if (companion) {
      if (WORKER_NUMBER.test(text)) companion.workerNumber ??= text;
      else if (!companion.workerNumber) companion.name = `${companion.name} ${text}`.trim();
      continue;
    }
    const lead = text.match(COMPANION);
    if (lead && workerNumber) {
      companion = { role: lead[1], name: lead[2], workerNumber: null };
    } else if (WORKER_NUMBER.test(text)) {
      workerNumber ??= text;
    } else if (!workerNumber) {
      nameParts.push(text);
    }
  }

  return { workerName: nameParts.join(' '), workerNumber, companion };
}
