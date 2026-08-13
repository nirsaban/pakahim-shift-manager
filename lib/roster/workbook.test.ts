import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { groupWorkbookByDate } from './workbook';
import { cleanSectionName, parseSectionDate, parseSheetDates, parseWeekday } from './sheet';

const HEADER = ['מס"ד', 'שם הפקח', 'מירס', 'מס\' עובד', 'שם המתלמד', 'מירס', 'מס\' עובד', 'שעת התחלה', 'שעת סיום'];

/** A block header row: the title lives in the route-note column (index 9). */
function blockHeader(title: string): unknown[] {
  return [...HEADER, title];
}

/** The same header as the department writes it on every block but the first. */
function altBlockHeader(title: string): unknown[] {
  return ["מס' סידור", ...HEADER.slice(1), title];
}

/** One roster line. Column 10 is the shift string, which a row needs to survive. */
function dutyRow(serial: string, name: string, workerNumber: string, shiftString = '238bt-629-647'): unknown[] {
  return [serial, name, '100', workerNumber, '', '', '', '06:00', '14:00', '', shiftString, ''];
}

function workbook(sheets: Record<string, unknown[][]>): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  }
  return wb;
}

const ymd = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

describe('parseSectionDate', () => {
  it('reads the date out of a block header title', () => {
    expect(ymd(parseSectionDate("פקחים דרום יום ה' 13.08.26")!)).toBe('2026-8-13');
  });

  it('reads a date that is not at the end of the title', () => {
    expect(ymd(parseSectionDate('סידור 14.08.26 - אזור צפון')!)).toBe('2026-8-14');
  });

  it('returns null when the title states no date', () => {
    expect(parseSectionDate('פקחים דרום')).toBeNull();
  });

  it('rejects a number pair that cannot be a date', () => {
    expect(parseSectionDate('קרונות 45.99.26')).toBeNull();
  });
});

describe('parseSheetDates', () => {
  it('reads a single-date sheet name', () => {
    expect(parseSheetDates('13.08.26').map(ymd)).toEqual(['2026-8-13']);
  });

  it('expands the weekend range the department names its Friday+Saturday file', () => {
    expect(parseSheetDates('14.08.26-15.08.26').map(ymd)).toEqual(['2026-8-14', '2026-8-15']);
  });

  it('takes the year from the end of the range when the first date omits it', () => {
    expect(parseSheetDates('14.08 - 16.08.26').map(ymd)).toEqual(['2026-8-14', '2026-8-15', '2026-8-16']);
  });

  it('rejects a backwards range, an implausible span and a name that is not a date', () => {
    expect(parseSheetDates('15.08.26-14.08.26')).toEqual([]);
    expect(parseSheetDates('01.01.26-31.12.26')).toEqual([]);
    expect(parseSheetDates('גיליון1')).toEqual([]);
  });
});

describe('parseWeekday', () => {
  it('reads the letter form the roster titles use', () => {
    expect(parseWeekday("פקחים דרום יום ו' 27.06.26")).toBe(5);
    expect(parseWeekday("פקחים דרום יום א' 16.08.26")).toBe(0);
  });

  it('reads מוצ"ש as Saturday', () => {
    expect(parseWeekday('פקחים דרום לינק דיזל+חשמלי מוצ"ש לו"ז 27.06.26')).toBe(6);
  });

  it('reads a spelled-out day name', () => {
    expect(parseWeekday('פקחים דרום יום שישי')).toBe(5);
  });

  it('returns null when the title names no day', () => {
    expect(parseWeekday('פקחים ב"ש')).toBeNull();
  });
});

describe('cleanSectionName', () => {
  it('collapses the same section across days to one stable name', () => {
    expect(cleanSectionName("פקחים דרום יום ה' 13.08.26")).toBe('פקחים דרום');
    expect(cleanSectionName('פקחים דרום 14.08.26')).toBe('פקחים דרום');
  });

  it('strips the Saturday-night wording so it does not fork into its own team', () => {
    expect(cleanSectionName('פקחים דרום מוצ"ש לו"ז 27.06.26')).toBe('פקחים דרום');
    expect(cleanSectionName('פקחים דרום יום שישי')).toBe('פקחים דרום');
  });
});

describe('groupWorkbookByDate', () => {
  it('imports one day per sheet when sheets are named DD.MM.YY', () => {
    const scan = groupWorkbookByDate(
      workbook({
        '13.08.26': [blockHeader('פקחים דרום'), dutyRow('1', 'דנה', '100001')],
        '14.08.26': [blockHeader('פקחים דרום'), dutyRow('1', 'דנה', '100001'), dutyRow('2', 'יוסי', '100002')],
      }),
    );

    expect(scan.days.map((d) => ymd(d.date))).toEqual(['2026-8-13', '2026-8-14']);
    expect(scan.days.map((d) => d.rosterRows.length)).toEqual([1, 2]);
    expect(scan.undated).toBe(0);
  });

  it('splits several dated blocks stacked inside one sheet', () => {
    const scan = groupWorkbookByDate(
      workbook({
        גיליון1: [
          blockHeader("פקחים דרום יום ה' 13.08.26"),
          dutyRow('1', 'דנה', '100001'),
          [],
          blockHeader("פקחים דרום יום ו' 14.08.26"),
          dutyRow('1', 'יוסי', '100002'),
          dutyRow('2', 'רונית', '100003'),
        ],
      }),
    );

    expect(scan.days.map((d) => ymd(d.date))).toEqual(['2026-8-13', '2026-8-14']);
    expect(scan.days.map((d) => d.rosterRows.length)).toEqual([1, 2]);
    // The date is stripped, so the same block is one section across both days.
    expect([...new Set(scan.days.flatMap((d) => d.rosterRows.map((r) => r.section)))]).toEqual(['פקחים דרום']);
  });

  it('merges the same date appearing in more than one sheet', () => {
    const scan = groupWorkbookByDate(
      workbook({
        דרום: [blockHeader('פקחים דרום 13.08.26'), dutyRow('1', 'דנה', '100001')],
        צפון: [blockHeader('פקחים צפון 13.08.26'), dutyRow('1', 'יוסי', '100002')],
      }),
    );

    expect(scan.days).toHaveLength(1);
    expect(scan.days[0].rosterRows).toHaveLength(2);
  });

  it('lets a block header override the sheet name', () => {
    const scan = groupWorkbookByDate(
      workbook({ '13.08.26': [blockHeader('פקחים דרום 15.08.26'), dutyRow('1', 'דנה', '100001')] }),
    );

    expect(scan.days.map((d) => ymd(d.date))).toEqual(['2026-8-15']);
  });

  it('falls back to today only when the whole workbook states no date', () => {
    const today = new Date(2026, 7, 20, 13, 45);
    const scan = groupWorkbookByDate(
      workbook({ גיליון1: [blockHeader('פקחים דרום'), dutyRow('1', 'דנה', '100001')] }),
      today,
    );

    expect(scan.days).toHaveLength(1);
    expect(ymd(scan.days[0].date)).toBe('2026-8-20');
    expect(scan.days[0].date.getHours()).toBe(0);
    expect(scan.undated).toBe(0);
  });

  it('drops undated rows rather than guessing when other rows are dated', () => {
    // Guessing here would destructively replace the wrong day's roster.
    const scan = groupWorkbookByDate(
      workbook({
        גיליון1: [
          blockHeader('פקחים דרום 13.08.26'),
          dutyRow('1', 'דנה', '100001'),
          [],
          blockHeader('פקחים ללא תאריך'),
          dutyRow('1', 'יוסי', '100002'),
        ],
      }),
    );

    expect(scan.days).toHaveLength(1);
    expect(ymd(scan.days[0].date)).toBe('2026-8-13');
    expect(scan.undated).toBe(1);
  });

  it('recognises the second spelling of the serial-column header', () => {
    // Missing this header loses the block's section AND its date, folding the
    // next day into the previous one - the 14.08-15.08 file's actual failure.
    const scan = groupWorkbookByDate(
      workbook({
        '13.08.26': [
          blockHeader('פקחים דרום'),
          dutyRow('1', 'דנה', '100001'),
          [],
          altBlockHeader('פקחים ב"ש'),
          dutyRow('1', 'יוסי', '100002'),
        ],
      }),
    );

    expect(scan.days).toHaveLength(1);
    expect(scan.days[0].rosterRows.map((r) => r.section)).toEqual(['פקחים דרום', 'פקחים ב"ש']);
    expect(scan.dropped).toBe(0);
  });

  // The real 14.08.26-15.08.26 file: the sheet name is a span, the blocks were
  // copied off a June file and still print 27.06.26, and only the weekday
  // wording ("יום ו'", "מוצ\"ש") says which day each block is really for.
  it('dates a weekend file by its weekday wording when the printed dates are stale', () => {
    const scan = groupWorkbookByDate(
      workbook({
        '14.08.26-15.08.26': [
          blockHeader("פקחים דרום לינק דיזל+חשמלי יום ו' 27.06.26"),
          dutyRow('1', 'דנה', '100001'),
          dutyRow('2', 'יוסי', '100002'),
          [],
          altBlockHeader('פקחים ב"ש'),
          dutyRow('1', 'רונית', '100003'),
          [],
          altBlockHeader('פקחים דרום לינק דיזל+חשמלי מוצ"ש לו"ז 27.06.26'),
          dutyRow('1', 'אבי', '100004'),
          [],
          altBlockHeader('פקחים ב"ש'),
          dutyRow('1', 'נועה', '100005'),
        ],
      }),
    );

    expect(scan.days.map((d) => ymd(d.date))).toEqual(['2026-8-14', '2026-8-15']);
    // The undated ב"ש block continues the day above it, on both days.
    expect(scan.days.map((d) => d.rosterRows.length)).toEqual([3, 2]);
    expect([...new Set(scan.days.flatMap((d) => d.rosterRows.map((r) => r.section)))]).toEqual([
      'פקחים דרום לינק דיזל+חשמלי',
      'פקחים ב"ש',
    ]);
    expect(scan.undated).toBe(0);
    expect(scan.dropped).toBe(0);
  });

  it('distrusts a printed date that contradicts its own weekday', () => {
    // 27.06.26 is a Saturday, so "יום ו'" cannot be it. Falls back to the sheet.
    const scan = groupWorkbookByDate(
      workbook({ '14.08.26': [blockHeader("פקחים דרום יום ו' 27.06.26"), dutyRow('1', 'דנה', '100001')] }),
    );

    expect(scan.days.map((d) => ymd(d.date))).toEqual(['2026-8-14']);
  });

  it('reports rather than guesses when a stale date leaves a block unplaceable', () => {
    const scan = groupWorkbookByDate(
      workbook({
        '14.08.26-15.08.26': [
          blockHeader("פקחים דרום יום ו' 27.06.26"),
          dutyRow('1', 'דנה', '100001'),
          [],
          // Outside the span, and no weekday saying which of the two days it is.
          altBlockHeader('פקחים צפון 27.06.26'),
          dutyRow('1', 'יוסי', '100002'),
        ],
      }),
    );

    expect(scan.days.map((d) => ymd(d.date))).toEqual(['2026-8-14']);
    expect(scan.days[0].rosterRows).toHaveLength(1);
    expect(scan.undated).toBe(1);
  });

  it('ignores sheets that carry no roster rows', () => {
    const scan = groupWorkbookByDate(
      workbook({
        הערות: [['הנחיות למשבצים'], ['נא לא לערוך']],
        '13.08.26': [blockHeader('פקחים דרום'), dutyRow('1', 'דנה', '100001')],
      }),
    );

    expect(scan.days).toHaveLength(1);
    expect(ymd(scan.days[0].date)).toBe('2026-8-13');
  });
});
