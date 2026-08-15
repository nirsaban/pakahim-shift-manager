import { describe, expect, it } from 'vitest';
import { compareToTeam, computeWorkload, MIN_REST_MINUTES, type WorkloadShift } from './workload';
import { israelTime } from '../time/zone';

/**
 * A shift on 2026-08-<day> from hh:00 for `hours`, in ISRAEL time.
 *
 * Built through the zone helper rather than `new Date(y, m, d, h)` so the
 * night/weekend rules are exercised against the clock the rules are written for
 * - otherwise this suite passes on a laptop in Israel and fails in CI.
 */
function shift(day: number, startHour: number, hours: number, status = 'SCHEDULED'): WorkloadShift {
  const startTime = israelTime(2026, 8, day, startHour * 60);
  const endTime = new Date(startTime.getTime() + hours * 60 * 60_000);
  return { startTime, endTime, status };
}

describe('computeWorkload', () => {
  it('is empty rather than zero when there are no shifts', () => {
    const m = computeWorkload([]);
    expect(m.shiftCount).toBe(0);
    expect(m.averageMinutes).toBeNull();
    expect(m.longestMinutes).toBeNull();
    expect(m.longestStreakDays).toBe(0);
  });

  it('sums, averages and takes the longest duration', () => {
    // 3rd is a Monday; days chosen so nothing lands on the weekend.
    const m = computeWorkload([shift(3, 6, 8), shift(5, 6, 6), shift(7, 6, 10)]);
    expect(m.shiftCount).toBe(3);
    expect(m.totalMinutes).toBe(24 * 60);
    expect(m.averageMinutes).toBe(8 * 60);
    expect(m.longestMinutes).toBe(10 * 60);
  });

  it('counts SICK and HOLIDAY as absences, never as light work', () => {
    const m = computeWorkload([shift(3, 6, 8), shift(4, 6, 8, 'SICK'), shift(5, 6, 8, 'HOLIDAY')]);
    expect(m.shiftCount).toBe(1);
    expect(m.absenceCount).toBe(2);
    expect(m.totalMinutes).toBe(8 * 60);
  });

  it('ignores cancelled shifts entirely', () => {
    const m = computeWorkload([shift(3, 6, 8), shift(4, 6, 8, 'CANCELLED')]);
    expect(m.shiftCount).toBe(1);
    expect(m.absenceCount).toBe(0);
  });

  it('counts a shift that starts before dawn as night work', () => {
    expect(computeWorkload([shift(3, 3, 6)]).nightShiftCount).toBe(1);
  });

  it('counts a shift that runs past midnight as night work', () => {
    expect(computeWorkload([shift(3, 22, 8)]).nightShiftCount).toBe(1);
  });

  it('does not count a shift that merely ends late', () => {
    expect(computeWorkload([shift(3, 14, 9)]).nightShiftCount).toBe(0);
  });

  it('does not count a shift that ends exactly at midnight', () => {
    expect(computeWorkload([shift(3, 16, 8)]).nightShiftCount).toBe(0);
  });

  it('counts Friday and Saturday as weekend work', () => {
    // 2026-08-07 is a Friday, 2026-08-08 a Saturday, 2026-08-09 a Sunday.
    const m = computeWorkload([shift(7, 6, 8), shift(8, 6, 8), shift(9, 6, 8)]);
    expect(m.weekendShiftCount).toBe(2);
  });

  it('flags a rest gap shorter than the legal minimum', () => {
    // Ends 22:00, next starts 04:00 - six hours of rest.
    const m = computeWorkload([shift(3, 14, 8), shift(4, 4, 8)]);
    expect(m.restWarnings).toHaveLength(1);
    expect(m.restWarnings[0].gapMinutes).toBe(6 * 60);
    expect(m.restWarnings[0].gapMinutes).toBeLessThan(MIN_REST_MINUTES);
  });

  it('accepts a rest gap exactly at the minimum', () => {
    // Ends 22:00, next starts 06:00 - eight hours.
    expect(computeWorkload([shift(3, 14, 8), shift(4, 6, 8)]).restWarnings).toHaveLength(0);
  });

  it('flags overlapping shifts as a rest violation rather than dropping them', () => {
    const m = computeWorkload([shift(3, 6, 8), shift(3, 10, 6)]);
    expect(m.restWarnings).toHaveLength(1);
    expect(m.restWarnings[0].gapMinutes).toBeLessThan(0);
  });

  it('counts distinct days worked, not shifts', () => {
    const m = computeWorkload([shift(3, 6, 4), shift(3, 14, 4), shift(4, 6, 4)]);
    expect(m.shiftCount).toBe(3);
    expect(m.daysWorked).toBe(2);
  });

  it('measures the longest run of consecutive days', () => {
    // 3,4,5 then a gap, then 8,9.
    const m = computeWorkload([shift(3, 6, 8), shift(4, 6, 8), shift(5, 6, 8), shift(8, 6, 8), shift(9, 6, 8)]);
    expect(m.longestStreakDays).toBe(3);
  });

  it('does not extend a streak across a repeated day', () => {
    const m = computeWorkload([shift(3, 6, 4), shift(3, 14, 4)]);
    expect(m.longestStreakDays).toBe(1);
  });

  it('sorts before measuring, so input order does not change the result', () => {
    const ordered = computeWorkload([shift(3, 14, 8), shift(4, 4, 8)]);
    const shuffled = computeWorkload([shift(4, 4, 8), shift(3, 14, 8)]);
    expect(shuffled).toEqual(ordered);
  });
});

describe('compareToTeam', () => {
  it('is null when nobody else has worked', () => {
    expect(compareToTeam(computeWorkload([shift(3, 6, 8)]), [])).toBeNull();
    expect(compareToTeam(computeWorkload([shift(3, 6, 8)]), [computeWorkload([])])).toBeNull();
  });

  it('reports the gap against the team average', () => {
    const own = computeWorkload([shift(3, 6, 10)]);
    const team = [computeWorkload([shift(3, 6, 8)]), computeWorkload([shift(3, 6, 6)])];
    const result = compareToTeam(own, team);
    expect(result?.teamAverageMinutes).toBe(7 * 60);
    expect(result?.differenceMinutes).toBe(3 * 60);
  });
});
