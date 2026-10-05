import { describe, expect, it } from 'vitest';
import type { DriverRosterRow } from './roster';
import { planRosterPublish, shiftWindow } from './roster-plan';

const row = (over: Partial<DriverRosterRow> = {}): DriverRosterRow => ({
  serial: 1,
  startMinutes: 4 * 60 + 30,
  endMinutes: 11 * 60 + 20,
  originStation: 'לוד',
  task: '',
  trainNumbers: [],
  mirs: null,
  companionMirs: null,
  workerName: 'א א',
  workerNumber: '700001',
  companion: null,
  page: 1,
  ...over,
});

describe('shiftWindow', () => {
  // The suite runs under UTC, Asia/Jerusalem and America/New_York; these
  // instants must come out the same in all three.
  it('builds Israel wall-clock times, whatever zone the server is in', () => {
    const w = shiftWindow({ year: 2026, month: 10, day: 1 }, row());
    // 1 Oct 2026 is summer time, UTC+3.
    expect(w.date.toISOString()).toBe('2026-09-30T21:00:00.000Z');
    expect(w.startTime.toISOString()).toBe('2026-10-01T01:30:00.000Z');
    expect(w.endTime.toISOString()).toBe('2026-10-01T08:20:00.000Z');
  });

  it('ends an overnight shift the next day', () => {
    const w = shiftWindow({ year: 2026, month: 10, day: 1 }, row({ startMinutes: 17 * 60 + 35, endMinutes: 40 }));
    expect(w.endTime.toISOString()).toBe('2026-10-01T21:40:00.000Z');
  });

  it('rolls an overnight shift over the end of the month', () => {
    const w = shiftWindow({ year: 2026, month: 10, day: 31 }, row({ startMinutes: 23 * 60, endMinutes: 5 * 60 }));
    // 31 Oct 2026 is after the change to winter time, UTC+2.
    expect(w.endTime.toISOString()).toBe('2026-11-01T03:00:00.000Z');
  });
});

describe('planRosterPublish', () => {
  const drivers = new Map([
    ['700001', 'u1'],
    ['700002', 'u2'],
  ]);

  it('creates a shift for each row on a first upload', () => {
    const plan = planRosterPublish([row(), row({ serial: 2, workerNumber: '700002' })], drivers, []);
    expect(plan.shifts.map((s) => [s.workerId, s.existingShiftId])).toEqual([
      ['u1', null],
      ['u2', null],
    ]);
    expect(plan.removeShiftIds).toEqual([]);
  });

  it('keeps each driver\'s shift on a re-upload, so reminders are not sent twice', () => {
    const plan = planRosterPublish([row({ serial: 5 })], drivers, [{ id: 's1', workerId: 'u1' }]);
    expect(plan.shifts[0].existingShiftId).toBe('s1');
    expect(plan.removeShiftIds).toEqual([]);
  });

  it('removes the shift of a driver the corrected file dropped', () => {
    const plan = planRosterPublish([row()], drivers, [
      { id: 's1', workerId: 'u1' },
      { id: 's2', workerId: 'u2' },
    ]);
    expect(plan.removeShiftIds).toEqual(['s2']);
  });

  it('pairs a driver\'s two lines with their two shifts in order', () => {
    const plan = planRosterPublish([row(), row({ serial: 9 })], drivers, [
      { id: 's1', workerId: 'u1' },
      { id: 's2', workerId: 'u1' },
    ]);
    expect(plan.shifts.map((s) => s.existingShiftId)).toEqual(['s1', 's2']);
  });

  it('creates a driver who is on the roster but not in the contact list, once', () => {
    const plan = planRosterPublish(
      [row({ workerNumber: '799999', workerName: 'חדש' }), row({ serial: 2, workerNumber: '799999', workerName: 'חדש' })],
      drivers,
      [],
    );
    expect(plan.newDrivers).toEqual([{ workerNumber: '799999', name: 'חדש' }]);
    expect(plan.shifts.every((s) => s.workerId === null)).toBe(true);
  });

  it('sets aside a row with no worker number', () => {
    const plan = planRosterPublish([row({ workerNumber: null })], drivers, []);
    expect(plan.unlinked).toHaveLength(1);
    expect(plan.shifts).toEqual([]);
  });
});
