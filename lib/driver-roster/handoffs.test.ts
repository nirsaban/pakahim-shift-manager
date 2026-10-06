import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { readPdfTextItems } from './pdf';
import { parseDriverRoster } from './roster';
import { dayHandoffs, drivenTrains, taskSteps, type DayDuty } from './handoffs';

const label = (task: string) =>
  taskSteps(task).map((s) => (s.kind === 'train' ? s.number + (s.passenger ? 'בת' : '') : s.name));

describe('taskSteps', () => {
  it('reads a stored line in time order - the reverse of how it is stored', () => {
    expect(label('32 בת - ב"ש - 23 - לוד - 503 - 2504 - בדק')).toEqual(['בדק', '2504', '503', 'לוד', '23', 'ב"ש', '32בת']);
  });

  it('keeps wrapped lines in order, each reversed', () => {
    expect(label('509 - 506 - 2502 - תא"ד 514')).toEqual(['תא"ד', '2502', '506', '509', '514']);
  });

  it('reads "בת" as riding the train, not driving it', () => {
    const steps = taskSteps('הגנה - 640 - 246 בת');
    expect(steps[0]).toEqual({ kind: 'train', number: '246', passenger: true });
    expect(drivenTrains(steps)).toEqual(['640']);
  });

  it('counts a train printed twice with stray parentheses once', () => {
    expect(label('516 - 511 - 511) - אוטם - 508 - 503')).toEqual(['503', '508', 'אוטם', '511', '516']);
  });
});

const duty = (shiftId: string, startHour: number, task: string, originStation: string | null = null): DayDuty => ({
  shiftId,
  workerId: `w${shiftId}`,
  startTime: new Date(Date.UTC(2026, 9, 1, startHour)),
  originStation,
  task,
});

describe('dayHandoffs', () => {
  it('hands a train to the driver for whom it is the first train, at the station it reaches', () => {
    const h = dayHandoffs([
      duty('8', 5, '23 - לוד - 503 - 2504 - בדק'),
      duty('16', 7, '508 - 503', 'לוד'),
    ]);
    expect(h.get('8')!.handsOverTo).toEqual([{ shiftId: '16', workerId: 'w16', trainNumber: '503', station: 'לוד' }]);
    expect(h.get('16')!.takesOverFrom).toEqual([{ shiftId: '8', workerId: 'w8', trainNumber: '503', station: 'לוד' }]);
  });

  it('skips activity words when looking for the station', () => {
    // In time order: 600, בדק, הגנה, then a taxi home.
    const h = dayHandoffs([duty('a', 5, 'מונית - הגנה - בדק - 600'), duty('b', 9, '601 - 600')]);
    expect(h.get('a')!.handsOverTo[0].station).toBe('הגנה');
  });

  it('falls back to the later driver\'s origin station', () => {
    const h = dayHandoffs([duty('5', 4, '514 - 509'), duty('24', 12, '517 - 514', 'לוד')]);
    expect(h.get('5')!.handsOverTo[0]).toMatchObject({ shiftId: '24', station: 'לוד' });
  });

  it('decides by start time when the train is first for both, or for neither', () => {
    const h = dayHandoffs([duty('late', 14, '516 - לוד - 519'), duty('early', 7, '516 - 503')]);
    expect(h.get('early')!.handsOverTo.map((x) => x.shiftId)).toEqual(['late']);
  });

  it('never pairs a passenger with the train\'s driver', () => {
    const h = dayHandoffs([duty('rides', 4, '233 בת - סבידור'), duty('drives', 5, '246 - 233 - בנימינה')]);
    expect(h.get('rides')).toEqual({ takesOverFrom: [], handsOverTo: [] });
  });
});

const REAL_ROSTER = join(__dirname, '..', '..', 'fixtures', 'drivers', 'roster-01.10.2026.pdf');

describe.skipIf(!existsSync(REAL_ROSTER))('dayHandoffs on the real 01.10.2026 report', () => {
  it('finds the handoffs read off the report by hand', async () => {
    const { rows } = parseDriverRoster(await readPdfTextItems(new Uint8Array(readFileSync(REAL_ROSTER))));
    const h = dayHandoffs(
      rows.map((r) => ({
        shiftId: String(r.serial),
        workerId: r.workerNumber!,
        startTime: new Date(Date.UTC(2026, 9, 1, 0, r.startMinutes)),
        originStation: r.originStation,
        task: r.task,
      })),
    );
    const pair = (from: number, to: number) => h.get(String(from))!.handsOverTo.find((x) => x.shiftId === String(to));

    // ברוך אברהם drives 503 into לוד; קוסטיה אייכנבאום starts his day on it.
    expect(pair(8, 16)).toMatchObject({ trainNumber: '503', station: 'לוד' });
    // The roster admin takes 640 over at הגנה and hands 666 on there.
    expect(h.get('56')!.takesOverFrom).toEqual([expect.objectContaining({ shiftId: '93', trainNumber: '640', station: 'הגנה' })]);
    expect(h.get('56')!.handsOverTo).toEqual([expect.objectContaining({ shiftId: '145', trainNumber: '666', station: 'הגנה' })]);
    // Riding 233 as a passenger (#3) is not taking it over from its driver (#89).
    expect(h.get('3')!.takesOverFrom.concat(h.get('3')!.handsOverTo).some((x) => x.trainNumber === '233')).toBe(false);
    // Every handoff found has a station.
    const all = [...h.values()].flatMap((v) => v.handsOverTo);
    expect(all.length).toBeGreaterThan(90);
    expect(all.every((x) => x.station)).toBe(true);
  });
});
