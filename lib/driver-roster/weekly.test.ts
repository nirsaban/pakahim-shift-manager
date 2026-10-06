import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { readPdfTextItems } from './pdf';
import { isWeeklyLinkReport, parseWeeklyRoster } from './weekly';
import { dayHandoffs, drivenTrains, taskSteps } from './handoffs';

// A page laid out like the real report (landscape): header dates per day,
// columns ~101pt wide with cell text flush against each column's left border.
type Item = { str: string; x: number; y: number; width: number; dir?: string };
const at = (str: string, x: number, y: number, width = 20, dir = /[א-ת]/.test(str) ? 'rtl' : 'ltr'): Item => ({ str, x, y, width, dir });

// Column left borders, Friday (leftmost) to Saturday (rightmost), as measured on the report.
const BORDERS = [19, 119, 220, 320, 421, 520, 622];
const DATES = ['09/10/2026', '08/10/2026', '07/10/2026', '06/10/2026', '05/10/2026', '04/10/2026', '03/10/2026'];
const LETTERS = ['ו', 'ה', 'ד', 'ג', 'ב', 'א', 'ש'];

function header(): Item[] {
  return [
    at('דוח לינק יומי ושבועי', 497, 556, 129),
    at('דרום נהגים', 339, 557, 55),
    at('01/10/2026', 756, 559, 50),
    at('לינק', 785, 532, 16),
    at('שם עובד', 716, 528, 35),
    ...DATES.flatMap((d, i) => [at(d, BORDERS[i] + 36, 527, 50), at(LETTERS[i], BORDERS[i] + 15, 528, 7)]),
  ];
}

/** Cell text for day `col` (0 = Friday … 6 = Saturday), lines top to bottom, words left to right. */
function cell(col: number, top: number, lines: string[][]): Item[] {
  return lines.flatMap((words, n) => {
    let x = BORDERS[col] + 2;
    return words.map((w) => {
      const item = at(w, x, top - n * 11, w.length * 4);
      x += w.length * 4 + 8;
      return item;
    });
  });
}

describe('parseWeeklyRoster', () => {
  it('recognises the report by its title', () => {
    expect(isWeeklyLinkReport([header()])).toBe(true);
    expect(isWeeklyLinkReport([[at('דוח סידור עבודה יומי', 434, 779)]])).toBe(false);
  });

  it('reads a driver row: days off, and work with its hours, in calendar order', () => {
    const { days, rows, warnings } = parseWeeklyRoster([
      [
        ...header(),
        at('D01', 785, 504, 17),
        at('אור לוי', 737, 504, 24),
        ...cell(6, 504, [['מונית', 'הגנה', '7614'], ['(22:2504:35)']]), // Saturday, glued hours, overnight
        ...cell(5, 504, [['מנוחה']]), // Sunday off
        ...cell(0, 504, [['מונית', 'הרצליה', 'בדק'], ['6715', '6724'], ['(04:20', '11:05)']]), // Friday
        at('1', 522, 19, 5),
      ],
    ]);

    expect(warnings).toEqual([]);
    expect(days[0]).toEqual({ year: 2026, month: 10, day: 3 });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ link: 'D01', workerName: 'אור לוי', restDays: [1] });
    const [sat, fri] = rows[0].shifts;
    expect(sat).toMatchObject({ day: 0, startMinutes: 22 * 60 + 25, endMinutes: 4 * 60 + 35, originStation: 'הגנה' });
    expect(fri).toMatchObject({ day: 6, startMinutes: 4 * 60 + 20, endMinutes: 11 * 60 + 5, originStation: 'הרצליה' });
    // Stored as the daily report stores a task, so the same tools read it.
    expect(taskSteps(fri.task).map((s) => (s.kind === 'train' ? s.number : s.name))).toEqual([
      'מונית',
      'הרצליה',
      'בדק',
      '6715',
      '6724',
    ]);
  });

  it('reverses the words of a Hebrew run, which come in logical order', () => {
    const { rows } = parseWeeklyRoster([
      [
        ...header(),
        at('D02', 785, 504, 17),
        at('נהג', 737, 504, 24),
        at('244', BORDERS[4] + 2, 504, 15),
        at('251 בנימינה', BORDERS[4] + 36, 504, 47, 'rtl'),
        ...cell(4, 493, [['(10:50', '18:20)']]),
      ],
    ]);
    expect(drivenTrains(taskSteps(rows[0].shifts[0].task))).toEqual(['244', '251']);
    expect(taskSteps(rows[0].shifts[0].task)[1]).toEqual({ kind: 'place', name: 'בנימינה' });
  });

  it('keeps a passenger ride ("בת") as one, and leaves a standby cell without an origin', () => {
    const { rows } = parseWeeklyRoster([
      [
        ...header(),
        at('ד01', 785, 504, 17),
        at('נהג', 737, 504, 24),
        ...cell(3, 504, [['הגנה', 'בת', '506'], ['(08:00', '15:15)']]),
        ...cell(2, 504, [['ערב', 'חשמלי', 'מוכן'], ['(20:00', '04:00)']]),
      ],
    ]);
    const [tue, wed] = rows[0].shifts;
    expect(rows[0].link).toBe('ד01');
    expect(taskSteps(tue.task).find((s) => s.kind === 'train')).toEqual({ kind: 'train', number: '506', passenger: true });
    expect(wed).toMatchObject({ originStation: null, startMinutes: 20 * 60, endMinutes: 4 * 60 });
  });

  it('says when a work cell has no hours', () => {
    const { rows, warnings } = parseWeeklyRoster([
      [...header(), at('D03', 785, 504, 17), at('נהג', 737, 504, 24), ...cell(1, 504, [['מונית', 'הגנה', '7614']])],
    ]);
    expect(rows[0].shifts).toEqual([]);
    expect(warnings).toEqual(['D03 נהג, 8/10: לא נמצאו שעות - היום לא נקרא']);
  });
});

const REAL = join(__dirname, '..', '..', 'fixtures', 'drivers', 'weekly-03-09.10.2026.pdf');

describe.skipIf(!existsSync(REAL))('parseWeeklyRoster on the real 03–09.10.2026 report', () => {
  it('reads every row and every day', async () => {
    const { days, section, rows, warnings } = parseWeeklyRoster(await readPdfTextItems(new Uint8Array(readFileSync(REAL))));

    expect(section).toBe('דרום נהגים');
    expect(days.map((d) => d.day)).toEqual([3, 4, 5, 6, 7, 8, 9]);
    expect(rows).toHaveLength(134);
    // Every cell is work or a day off: 134 drivers × 7 days.
    expect(rows.reduce((n, r) => n + r.shifts.length + r.restDays.length, 0)).toBe(134 * 7);
    // The one problem in the file: a link printed without a driver's name.
    expect(warnings).toEqual(['עמוד 10: ללינק D74 אין שם נהג']);

    const d01 = rows.find((r) => r.link === 'D01')!;
    expect(d01.workerName).toBe('אור לוי');
    expect(d01.restDays).toEqual([1]);
    expect(d01.shifts.map((s) => [s.day, s.startMinutes, s.endMinutes])).toEqual([
      [0, 22 * 60 + 25, 4 * 60 + 35],
      [2, 10 * 60 + 50, 18 * 60 + 20],
      [3, 8 * 60, 15 * 60 + 15],
      [4, 3 * 60 + 20, 9 * 60 + 45],
      [5, 4 * 60 + 55, 11 * 60 + 20],
      [6, 4 * 60 + 20, 11 * 60 + 5],
    ]);
    // The Hebrew series of links is read too.
    expect(rows.find((r) => r.link === 'ד01')?.workerName).toBe('אריק גייר');

    // Handoffs come out of a weekly day as they do of a daily one.
    const monday = rows.flatMap((r) =>
      r.shifts
        .filter((s) => s.day === 2)
        .map((s) => ({ shiftId: r.link, workerId: r.link, startTime: new Date(Date.UTC(2026, 9, 5, 0, s.startMinutes)), originStation: s.originStation, task: s.task })),
    );
    const found = [...dayHandoffs(monday).values()].flatMap((h) => h.handsOverTo);
    expect(found.length).toBeGreaterThan(30);
    expect(found.every((h) => h.station)).toBe(true);
  });
});
