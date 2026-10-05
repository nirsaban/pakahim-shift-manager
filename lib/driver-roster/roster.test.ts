import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { readPdfTextItems } from './pdf';
import { parseDriverRoster, trainNumbersIn } from './roster';

// Pages laid out like the real report: item x positions are the ones measured
// on it, so these tests exercise the same column bands.
type Item = { str: string; x: number; y: number; width: number };
const at = (str: string, x: number, y: number, width = 20): Item => ({ str, x, y, width });

function header(section: string, date = '01/10/2026'): Item[] {
  return [
    at('תאריך הפקה:', 500, 814, 53),
    at('30/09/2026 14:43', 407, 814, 80),
    at(`${date} :תאריך`, 317, 781, 115),
    at('מחלקה:', 130, 779, 52),
    at(section, 63, 778, 64),
    at('שם עובד', 513, 759, 35),
    at('#', 451, 758, 6),
  ];
}

const footer = (page: number): Item[] => [
  at('חטיבת נוסעים – יחידת תפ"י תפעול', 201, 55, 364),
  at(`${page} of 15`, 281, 40, 33),
];

/** One roster row at height y. `name` lines go top to bottom from y. */
function row(y: number, o: { start: string; end: string; serial: string; mirs?: string[]; origin?: string[]; task?: string[][]; name: string[] }): Item[] {
  const items = [at(o.start, 13, y, 23), at(o.end, 47, y, 23), at(o.serial, 448, y, 6)];
  (o.mirs ?? []).forEach((m, i) => items.push(at(m, 467, y - i * 11)));
  (o.origin ?? []).forEach((s, i) => items.push(at(s, 80, y - i * 10)));
  // Each task line is given in reading order (right to left); x descends to match.
  (o.task ?? []).forEach((line, i) => line.forEach((t, j) => items.push(at(t, 400 - j * 30, y - i * 22, 15))));
  // Names are right-aligned at x+width = 565, as in the report.
  o.name.forEach((n, i) => items.push(at(n, 565 - n.length * 5, y - i * 11, n.length * 5)));
  return items;
}

describe('parseDriverRoster', () => {
  it('reads a row: times, origin, task, Mirs and the driver', () => {
    const { date, rows, warnings } = parseDriverRoster([
      [
        ...header('דרום נהגים'),
        ...row(735, {
          start: '04:30',
          end: '11:20',
          serial: '1',
          mirs: ['1282'],
          origin: ['תא"ד'],
          task: [['מונית', '-', 'מודיעין', '-', '109', '-', 'בדק']],
          name: ['מנחם פזרקר', '797493'],
        }),
        ...footer(1),
      ],
    ]);

    expect(warnings).toEqual([]);
    expect(date).toEqual({ year: 2026, month: 10, day: 1 });
    expect(rows).toEqual([
      {
        serial: 1,
        startMinutes: 4 * 60 + 30,
        endMinutes: 11 * 60 + 20,
        originStation: 'תא"ד',
        task: 'מונית - מודיעין - 109 - בדק',
        trainNumbers: ['109'],
        mirs: '1282',
        companionMirs: null,
        workerName: 'מנחם פזרקר',
        workerNumber: '797493',
        companion: null,
        page: 1,
      },
    ]);
  });

  it('reads a trainee or observer under the driver, with their own Mirs', () => {
    const { rows } = parseDriverRoster([
      [
        ...header('דרום נהגים'),
        ...row(735, {
          start: '05:25',
          end: '12:10',
          serial: '10',
          mirs: ['2430', '483'],
          name: ['יקיר חמד', '795807', 'חונך רוסלן', 'קליינרמן', '421297'],
        }),
      ],
    ]);
    expect(rows[0]).toMatchObject({
      workerName: 'יקיר חמד',
      workerNumber: '795807',
      mirs: '2430',
      companionMirs: '483',
      companion: { role: 'חונך', name: 'רוסלן קליינרמן', workerNumber: '421297' },
    });
  });

  it('drops the meaningless * from a name', () => {
    const { rows } = parseDriverRoster([
      [...header('דרום נהגים'), ...row(735, { start: '10:50', end: '15:15', serial: '18', name: ['לב בנדרסקי*', '797331'] })],
    ]);
    expect(rows[0].workerName).toBe('לב בנדרסקי');
  });

  it('reads a long right-aligned name that starts left of the name column', () => {
    const { rows } = parseDriverRoster([
      [
        ...header('דרום נהגים'),
        ...row(735, { start: '06:55', end: '13:15', serial: '16', mirs: ['2760'], name: ['קוסטיה אייכנבאום של שמונה', '793755'] }),
      ],
    ]);
    expect(rows[0]).toMatchObject({ workerName: 'קוסטיה אייכנבאום של שמונה', mirs: '2760' });
  });

  it('joins an origin station wrapped mid-word, at an underscore, or at a space', () => {
    const origins = [
      ['ראש_הע', 'ין_צפון'],
      ['_מתחם', 'אשקלון'],
      ['אוטם', 'סבידור'],
    ];
    const { rows } = parseDriverRoster([
      [
        ...header('דרום נהגים'),
        ...origins.flatMap((origin, i) =>
          row(700 - i * 100, { start: '05:00', end: '12:00', serial: String(i + 1), origin, name: ['א', '700001'] }),
        ),
      ],
    ]);
    expect(rows.map((r) => r.originStation)).toEqual(['ראש העין צפון', 'מתחם אשקלון', 'אוטם סבידור']);
  });

  it('gives a row its wrapped task lines, and its continuation from the top of the next page', () => {
    const { rows } = parseDriverRoster([
      [
        ...header('דרום נהגים'),
        ...row(120, {
          start: '11:20',
          end: '15:35',
          serial: '20',
          task: [['846', '-', '853'], ['רה"ע']],
          name: ['מיכאל קנפו', '796461'],
        }),
        ...footer(1),
      ],
      [
        ...header('דרום נהגים'),
        at('861', 122, 735, 15),
        ...row(717, { start: '11:45', end: '18:20', serial: '21', name: ['עמי פוני', '420786'] }),
        ...footer(2),
      ],
    ]);
    expect(rows.map((r) => r.serial)).toEqual([20, 21]);
    expect(rows[0].task).toBe('846 - 853 רה"ע 861');
    expect(rows[0].trainNumbers).toEqual(['846', '853', '861']);
    expect(rows[1].task).toBe('');
  });

  it('keeps a shift that ends after midnight as printed', () => {
    const { rows } = parseDriverRoster([
      [...header('דרום נהגים'), ...row(735, { start: '17:35', end: '00:40', serial: '63', name: ['א', '700001'] })],
    ]);
    expect(rows[0]).toMatchObject({ startMinutes: 17 * 60 + 35, endMinutes: 40 });
  });

  it('skips the north section, and does not carry its text into a south row', () => {
    const { rows, skippedSections } = parseDriverRoster([
      [...header('דרום נהגים'), ...row(120, { start: '20:25', end: '01:45', serial: '191', name: ['א', '700001'] })],
      [
        ...header('צפון נהגים'),
        at('מונית', 223, 735),
        ...row(717, { start: '14:20', end: '20:35', serial: '73', name: ['ב', '700002'] }),
      ],
    ]);
    expect(rows.map((r) => r.serial)).toEqual([191]);
    expect(rows[0].task).toBe('');
    expect(skippedSections).toEqual(['צפון נהגים']);
  });

  it('warns about a page dated differently from the rest', () => {
    const { date, warnings } = parseDriverRoster([
      [...header('דרום נהגים')],
      [...header('דרום נהגים', '02/10/2026')],
    ]);
    expect(date).toEqual({ year: 2026, month: 10, day: 1 });
    expect(warnings).toEqual(['עמוד 2 נושא תאריך 2/10/2026, שונה מתאריך הקובץ']);
  });

  it('skips a row with no end time, and says so', () => {
    const items = row(735, { start: '04:30', end: 'x', serial: '1', name: ['א', '700001'] });
    const { rows, warnings } = parseDriverRoster([[...header('דרום נהגים'), ...items]]);
    expect(rows).toEqual([]);
    expect(warnings).toEqual(['עמוד 1, שורה שמתחילה ב-04:30: חסרה שעת סיום - השורה לא נקראה']);
  });
});

describe('trainNumbersIn', () => {
  it('takes standalone numbers, without repeats, and leaves times and tagged tokens alone', () => {
    expect(trainNumbersIn('513 - (513 - 513) - אוטם - 19:55 - 233בת - 2101')).toEqual(['513', '2101']);
  });
});

// The real report is gitignored (names, worker numbers); this runs only where
// it has been placed by hand.
const REAL_ROSTER = join(__dirname, '..', '..', 'fixtures', 'drivers', 'roster-01.10.2026.pdf');

describe.skipIf(!existsSync(REAL_ROSTER))('parseDriverRoster on the real 01.10.2026 report', () => {
  it('reads every south row and nothing else', async () => {
    const pages = await readPdfTextItems(new Uint8Array(readFileSync(REAL_ROSTER)));
    const { date, rows, skippedSections, warnings } = parseDriverRoster(pages);

    expect(warnings).toEqual([]);
    expect(date).toEqual({ year: 2026, month: 10, day: 1 });
    expect(skippedSections).toEqual(['צפון נהגים']);
    expect(rows.map((r) => r.serial)).toEqual(Array.from({ length: 191 }, (_, i) => i + 1));
    expect(rows.every((r) => r.workerNumber)).toBe(true);
    expect(rows.filter((r) => r.companion)).toHaveLength(24);

    // The roster admin's own shift (row 56).
    expect(rows.find((r) => r.workerNumber === '795580')).toMatchObject({ serial: 56, startMinutes: 11 * 60 + 20 });
    // A task that ran onto page 2.
    expect(rows.find((r) => r.serial === 20)?.trainNumbers).toContain('861');
    // No page furniture leaked into a task.
    expect(rows.some((r) => / of 15|חטיבת/.test(r.task))).toBe(false);
  });
});
