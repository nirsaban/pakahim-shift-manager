// Israel Railways runs on Israel local time, and so does every number in the
// roster file. This module is the only place that knows it.
//
// The bug it exists to prevent: the importer used to build shift instants with
// `new Date(year, month, day)` + `setMinutes(...)`, which reads the SERVER's
// zone. Nothing sets TZ in the image, so production ran UTC and a 04:00 shift
// was stored as 04:00Z - three hours late in summer. Server-rendered times then
// formatted back in UTC and looked right, which is why it stayed hidden, while
// the pre-shift reminder compared those stamps against a real `now` and fired
// hours after the shift had already started.
//
// Everything here is pure and TZ-independent: the results are identical whether
// the process runs UTC, Asia/Jerusalem, or anything else. TZ is still set on the
// container (belt and braces, and it makes plain toLocaleString calls right),
// but nothing in the data path depends on it any more.

export const ROSTER_TIME_ZONE = 'Asia/Jerusalem';

const PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: ROSTER_TIME_ZONE,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export interface ZonedParts {
  year: number;
  /** 1-12, not the 0-11 the Date constructor wants. */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** What the clock in Israel reads at this instant. */
export function israelParts(instant: Date): ZonedParts {
  const parts = PARTS.formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes): number => {
    const found = parts.find((p) => p.type === type);
    return found ? Number(found.value) : 0;
  };
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    // Some engines render midnight as hour 24 under hour12:false.
    hour: value('hour') % 24,
    minute: value('minute'),
    second: value('second'),
  };
}

/** Israel's UTC offset in minutes at a given instant: +120 in winter, +180 in summer. */
export function israelOffsetMinutes(instant: Date): number {
  const p = israelParts(instant);
  const asIfUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  // Drop the ms - formatToParts has no ms field, so comparing them would add noise.
  return (asIfUTC - Math.floor(instant.getTime() / 1000) * 1000) / 60_000;
}

const DAY_MS = 24 * 60 * 60_000;

/**
 * The instant at which the clock in Israel reads this wall-clock time.
 *
 * `minutes` is minutes past midnight and may exceed 1440: a shift ending at
 * 02:40 the next morning is 1600 minutes past its own roster date's midnight,
 * which is how the roster itself expresses it.
 *
 * Twice a year a wall-clock time is not a single instant, and the roster does
 * schedule מוצ"ש duties straight through both moments:
 *
 *  - Ambiguous (autumn, clocks back): 01:00 happens twice. We take the FIRST,
 *    still on summer time - the convention Temporal, java.time and
 *    moment-timezone all settle on, and the one that keeps a duty's end from
 *    appearing to precede a later duty's start.
 *  - Nonexistent (spring, clocks forward): 02:30 never occurs. We push forward
 *    by the size of the gap, so it reads 03:30 rather than throwing at an admin
 *    who only uploaded the file the department sent.
 */
export function israelTime(year: number, month: number, day: number, minutes = 0): Date {
  const wallClockAsUTC = Date.UTC(year, month - 1, day) + minutes * 60_000;

  // The offsets in force a day either side bracket any transition in between.
  const before = israelOffsetMinutes(new Date(wallClockAsUTC - DAY_MS));
  const after = israelOffsetMinutes(new Date(wallClockAsUTC + DAY_MS));

  // A candidate is real only if converting back lands on the offset we assumed.
  const candidates = [before, after]
    .map((offset) => wallClockAsUTC - offset * 60_000)
    .filter((ts) => israelOffsetMinutes(new Date(ts)) === (wallClockAsUTC - ts) / 60_000);

  // No candidate survives inside a spring-forward gap; the pre-transition offset
  // is what shifts it forward into real time.
  if (candidates.length === 0) return new Date(wallClockAsUTC - before * 60_000);

  return new Date(Math.min(...candidates));
}

/** Midnight in Israel on a given calendar date. */
export function israelMidnight(year: number, month: number, day: number): Date {
  return israelTime(year, month, day, 0);
}

/** Midnight in Israel on the calendar day this instant falls in. */
export function startOfIsraelDay(instant: Date): Date {
  const p = israelParts(instant);
  return israelMidnight(p.year, p.month, p.day);
}

/** Same wall-clock time, `days` calendar days later - DST-correct, unlike +86400000. */
export function addIsraelDays(instant: Date, days: number): Date {
  const p = israelParts(instant);
  return israelTime(p.year, p.month, p.day + days, p.hour * 60 + p.minute);
}

/** yyyy-mm-dd as read in Israel. The key the client groups a schedule by. */
export function israelDateKey(instant: Date): string {
  const p = israelParts(instant);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** 0=Sunday..6=Saturday, as read in Israel. */
export function israelWeekday(instant: Date): number {
  const p = israelParts(instant);
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
}

/** Minutes past midnight, as read in Israel. */
export function israelMinutesOfDay(instant: Date): number {
  const p = israelParts(instant);
  return p.hour * 60 + p.minute;
}

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  timeZone: ROSTER_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
};

/** "14:35" in Israel time, whatever the server's zone. */
export function formatIsraelTime(instant: Date): string {
  return instant.toLocaleTimeString('he-IL', TIME_FORMAT);
}

/** "יום שישי, 14 באוגוסט" in Israel time. */
export function formatIsraelDate(
  instant: Date,
  options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' },
): string {
  return instant.toLocaleDateString('he-IL', { timeZone: ROSTER_TIME_ZONE, ...options });
}

/** Date and time together, for logs and admin tables. */
export function formatIsraelDateTime(instant: Date): string {
  return instant.toLocaleString('he-IL', {
    timeZone: ROSTER_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
