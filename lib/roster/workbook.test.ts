import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { groupWorkbookByDate } from './workbook';
import { cleanSectionName, parseSectionDate } from './sheet';

const HEADER = ['מס"ד', 'שם הפקח', 'מירס', 'מס\' עובד', 'שם המתלמד', 'מירס', 'מס\' עובד', 'שעת התחלה', 'שעת סיום'];

/** A block header row: the title lives in the route-note column (index 9). */
function blockHeader(title: string): unknown[] {
  return [...HEADER, title];
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

describe('cleanSectionName', () => {
  it('collapses the same section across days to one stable name', () => {
    expect(cleanSectionName("פקחים דרום יום ה' 13.08.26")).toBe('פקחים דרום');
    expect(cleanSectionName('פקחים דרום 14.08.26')).toBe('פקחים דרום');
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
