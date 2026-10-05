import { describe, expect, it } from 'vitest';
import { israelMidnight, israelTime } from '../time/zone';
import { isOnShift, pickRosterDay, relativeDayLabel } from './display';

// 00:30 on 2 Oct in Israel is still 1 Oct in UTC (21:30) and in New York
// (17:30). Anything that reads "today" in the server's zone gets it wrong in
// two of the three zones the suite runs under.
const justAfterMidnight = israelTime(2026, 10, 2, 30);

describe('relativeDayLabel', () => {
  it('names today and tomorrow by the Israel calendar', () => {
    expect(relativeDayLabel(israelMidnight(2026, 10, 2), justAfterMidnight)).toBe('היום');
    expect(relativeDayLabel(israelMidnight(2026, 10, 3), justAfterMidnight)).toBe('מחר');
  });

  it('spells out any other day', () => {
    expect(relativeDayLabel(israelMidnight(2026, 10, 4), justAfterMidnight)).toBe('יום ראשון, 4 באוקטובר');
  });
});

describe('pickRosterDay', () => {
  const days = [israelMidnight(2026, 10, 1), israelMidnight(2026, 10, 2), israelMidnight(2026, 10, 3)];

  it('prefers today', () => {
    expect(pickRosterDay(days, justAfterMidnight)).toEqual(israelMidnight(2026, 10, 2));
  });

  it('falls back to the next published day', () => {
    expect(pickRosterDay([days[0], days[2]], justAfterMidnight)).toEqual(israelMidnight(2026, 10, 3));
  });

  it('falls back to the latest past day when nothing is ahead', () => {
    expect(pickRosterDay([days[0]], justAfterMidnight)).toEqual(israelMidnight(2026, 10, 1));
  });

  it('has nothing to show before any roster is published', () => {
    expect(pickRosterDay([], justAfterMidnight)).toBeNull();
  });
});

describe('isOnShift', () => {
  const shift = { startTime: israelTime(2026, 10, 1, 17 * 60), endTime: israelTime(2026, 10, 2, 40) };

  it('is true from the start up to, not including, the end', () => {
    expect(isOnShift(shift, shift.startTime)).toBe(true);
    expect(isOnShift(shift, justAfterMidnight)).toBe(true);
    expect(isOnShift(shift, shift.endTime)).toBe(false);
  });
});
