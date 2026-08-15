import { describe, expect, it } from 'vitest';
import {
  addIsraelDays,
  israelDateKey,
  israelMidnight,
  israelMinutesOfDay,
  israelOffsetMinutes,
  israelTime,
  israelWeekday,
  startOfIsraelDay,
} from './zone';

// Every expectation here is written in UTC on purpose. These assertions must
// hold whatever TZ the test runner happens to have - that is the whole point of
// the module, and asserting in local time would make the suite pass on a laptop
// in Israel while the production container stayed three hours out.

describe('israelOffsetMinutes', () => {
  it('is +2h in winter and +3h in summer', () => {
    expect(israelOffsetMinutes(new Date('2026-01-15T12:00:00Z'))).toBe(120);
    expect(israelOffsetMinutes(new Date('2026-08-15T12:00:00Z'))).toBe(180);
  });
});

describe('israelTime', () => {
  it('reads a summer roster time as IDT, not as UTC', () => {
    // 04:00 on 14.08.26 in Israel is 01:00Z. Storing it as 04:00Z - what the
    // old local-constructor path did on a UTC server - is the reminder bug.
    expect(israelTime(2026, 8, 14, 4 * 60).toISOString()).toBe('2026-08-14T01:00:00.000Z');
  });

  it('reads a winter roster time as IST', () => {
    expect(israelTime(2026, 1, 14, 4 * 60).toISOString()).toBe('2026-01-14T02:00:00.000Z');
  });

  it('carries a past-midnight end time into the next day', () => {
    // A מוצ"ש duty ending 02:40 is 1600 minutes past its roster date's midnight.
    expect(israelTime(2026, 8, 15, 26 * 60 + 40).toISOString()).toBe('2026-08-15T23:40:00.000Z');
  });

  it('lands on the right side of the spring-forward transition', () => {
    // Israel moves to IDT at 02:00 on the last Friday of March (27.03.26).
    // 01:00 is still IST (+2), 04:00 is already IDT (+3).
    expect(israelTime(2026, 3, 27, 60).toISOString()).toBe('2026-03-26T23:00:00.000Z');
    expect(israelTime(2026, 3, 27, 4 * 60).toISOString()).toBe('2026-03-27T01:00:00.000Z');
  });

  it('lands on the right side of the autumn transition', () => {
    // Back to IST at 02:00 on the last Sunday of October (25.10.26).
    // 01:00 happens twice that night; the first (still IDT) is the one taken.
    expect(israelTime(2026, 10, 25, 60).toISOString()).toBe('2026-10-24T22:00:00.000Z');
    expect(israelTime(2026, 10, 25, 5 * 60).toISOString()).toBe('2026-10-25T03:00:00.000Z');
  });

  it('pushes a nonexistent spring-forward time up into real time', () => {
    // 02:30 on 27.03.26 never happens - the clock goes 01:59:59 -> 03:00:00.
    // Reading it as 03:30 IDT beats failing an upload of a file we were sent.
    const pushed = israelTime(2026, 3, 27, 2 * 60 + 30);
    expect(pushed.toISOString()).toBe('2026-03-27T00:30:00.000Z');
    expect(israelMinutesOfDay(pushed)).toBe(3 * 60 + 30);
  });
});

describe('israelMidnight / startOfIsraelDay', () => {
  it('is 21:00Z the previous day in summer', () => {
    expect(israelMidnight(2026, 8, 14).toISOString()).toBe('2026-08-13T21:00:00.000Z');
  });

  it('finds the Israeli day an instant falls in, not the UTC one', () => {
    // 22:30Z on the 13th is already 01:30 on the 14th in Israel.
    expect(startOfIsraelDay(new Date('2026-08-13T22:30:00Z')).toISOString()).toBe(
      '2026-08-13T21:00:00.000Z',
    );
  });
});

describe('addIsraelDays', () => {
  it('keeps the wall-clock time across a DST boundary', () => {
    // 20:00 the day before the spring-forward is still 20:00 the day after,
    // even though only 23 hours passed.
    const before = israelTime(2026, 3, 26, 20 * 60);
    const after = addIsraelDays(before, 1);
    expect(israelMinutesOfDay(after)).toBe(20 * 60);
    expect(after.getTime() - before.getTime()).toBe(23 * 60 * 60_000);
  });
});

describe('israelDateKey / israelWeekday / israelMinutesOfDay', () => {
  it('reads the Israeli calendar day, not the UTC one', () => {
    const lateEvening = new Date('2026-08-14T21:30:00Z'); // 00:30 on the 15th in Israel
    expect(israelDateKey(lateEvening)).toBe('2026-08-15');
    expect(israelWeekday(lateEvening)).toBe(6); // Saturday
    expect(israelMinutesOfDay(lateEvening)).toBe(30);
  });

  it('reads 14.08.26 as a Friday', () => {
    expect(israelWeekday(israelMidnight(2026, 8, 14))).toBe(5);
  });
});
