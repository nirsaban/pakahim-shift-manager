import { describe, expect, it } from 'vitest';
import { israelParts, israelTime } from '../time/zone';
import {
  DEFAULT_WORKLOAD_RANGE,
  parseWorkloadRange,
  WORKLOAD_RANGES,
  workloadWindowFor,
} from './workload-range';

/** 2026-08-13, mid-morning in Israel - a date with a full month and year behind it. */
const NOW = israelTime(2026, 8, 13, 10 * 60 + 30);

/** Boundaries are asserted as Israel wall-clock, never as the runner's zone. */
function parts(instant: Date) {
  const { year, month, day, hour, minute } = israelParts(instant);
  return { year, month, day, hour, minute };
}

describe('workloadWindowFor', () => {
  it('always ends at the end of today in Israel, whatever the range', () => {
    for (const range of WORKLOAD_RANGES) {
      const { to } = workloadWindowFor(range, NOW);
      expect(parts(to)).toEqual({ year: 2026, month: 8, day: 13, hour: 23, minute: 59 });
    }
  });

  it('starts each range at midnight, so a night shift is not half-counted', () => {
    for (const range of WORKLOAD_RANGES) {
      const { from } = workloadWindowFor(range, NOW);
      const { hour, minute } = israelParts(from);
      expect({ hour, minute }).toEqual({ hour: 0, minute: 0 });
    }
  });

  it('looks a week back', () => {
    const { from } = workloadWindowFor('week', NOW);
    expect(parts(from)).toMatchObject({ year: 2026, month: 8, day: 6 });
  });

  it('looks a calendar month back', () => {
    const { from } = workloadWindowFor('month', NOW);
    expect(parts(from)).toMatchObject({ year: 2026, month: 7, day: 13 });
  });

  it('looks a calendar year back', () => {
    const { from } = workloadWindowFor('year', NOW);
    expect(parts(from)).toMatchObject({ year: 2025, month: 8, day: 13 });
  });

  it('never reaches forward - the window ends today', () => {
    for (const range of WORKLOAD_RANGES) {
      const { from, to } = workloadWindowFor(range, NOW);
      expect(from.getTime()).toBeLessThan(NOW.getTime());
      expect(to.getTime() - NOW.getTime()).toBeLessThan(24 * 60 * 60_000);
    }
  });

  it('crosses a year boundary on the way back', () => {
    const { from } = workloadWindowFor('month', israelTime(2026, 1, 9, 9 * 60));
    expect(parts(from)).toMatchObject({ year: 2025, month: 12, day: 9 });
  });

  it('clamps a month back from the 31st to the end of the shorter month', () => {
    // Naive month arithmetic would land on 2026-03-03 and shorten the window to
    // three days for anyone opening the app on the 31st.
    const { from } = workloadWindowFor('month', israelTime(2026, 3, 31, 9 * 60));
    expect(parts(from)).toMatchObject({ year: 2026, month: 2, day: 28 });
  });

  it('clamps a year back from a leap day', () => {
    const { from } = workloadWindowFor('year', israelTime(2028, 2, 29, 9 * 60));
    expect(parts(from)).toMatchObject({ year: 2027, month: 2, day: 28 });
  });

  it('holds the boundaries at midnight across the spring DST change', () => {
    // Israel moves the clocks forward on the last Friday of March; a window
    // built on +86400000 arithmetic would start at 01:00 instead of midnight.
    const { from, to } = workloadWindowFor('week', israelTime(2026, 3, 31, 9 * 60));
    expect(parts(from)).toMatchObject({ year: 2026, month: 3, day: 24, hour: 0, minute: 0 });
    expect(parts(to)).toMatchObject({ year: 2026, month: 3, day: 31, hour: 23, minute: 59 });
  });
});

describe('parseWorkloadRange', () => {
  it('accepts the three ranges', () => {
    for (const range of WORKLOAD_RANGES) expect(parseWorkloadRange(range)).toBe(range);
  });

  it('falls back to the default rather than throwing on junk', () => {
    for (const value of [undefined, null, '', 'decade', 7, {}]) {
      expect(parseWorkloadRange(value)).toBe(DEFAULT_WORKLOAD_RANGE);
    }
  });

  it('defaults to the last month', () => {
    expect(DEFAULT_WORKLOAD_RANGE).toBe('month');
  });
});
