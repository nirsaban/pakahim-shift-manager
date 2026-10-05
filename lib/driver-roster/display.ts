import { he } from '../he';
import { formatIsraelDate, israelDateKey } from '../time/zone';

/**
 * Small display rules for the driver screen, kept pure so they are tested
 * under every time zone the suite runs in.
 */

/** Whole calendar days from `now` to `instant`, both read in Israel. */
function israelDayDiff(instant: Date, now: Date): number {
  const toUtcDay = (key: string) => Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)));
  return Math.round((toUtcDay(israelDateKey(instant)) - toUtcDay(israelDateKey(now))) / 86_400_000);
}

/** "היום", "מחר", or the date itself ("יום שישי, 2 באוקטובר"). */
export function relativeDayLabel(instant: Date, now: Date): string {
  const diff = israelDayDiff(instant, now);
  if (diff === 0) return he.schedule.today;
  if (diff === 1) return he.schedule.tomorrow;
  return formatIsraelDate(instant);
}

/**
 * Which published roster day the day list shows: today's when there is one,
 * otherwise the next one published, otherwise the most recent. The file comes
 * out around midday for the next day, so "the next one" is usually tomorrow.
 */
export function pickRosterDay(publishedDays: Date[], now: Date): Date | null {
  const today = israelDateKey(now);
  const sorted = [...publishedDays].sort((a, b) => a.getTime() - b.getTime());
  return (
    sorted.find((d) => israelDateKey(d) === today) ??
    sorted.find((d) => israelDateKey(d) > today) ??
    sorted.at(-1) ??
    null
  );
}

/** Whether `now` falls inside a shift. */
export function isOnShift(shift: { startTime: Date; endTime: Date }, now: Date): boolean {
  return shift.startTime <= now && now < shift.endTime;
}
