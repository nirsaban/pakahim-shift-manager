// The window a workload card is measured over.
//
// Pure like the rest of lib/roster/: the service turns a window into a prisma
// query, the page parses a range name off the query string, and the card
// renders whichever one the worker picked. All three agree on the arithmetic
// here, so a tab labelled "חודש" and the dates printed beside it can never
// describe different spans.
//
// Every boundary is a wall-clock moment in Israel, built through lib/time/zone,
// not through the server's own zone: a window that started at UTC midnight would
// drop the first two or three hours of a night shift from the count.

import { israelMidnight, israelParts } from '../time/zone';

/** Both ends inclusive — fed straight to prisma as `gte` / `lte`. */
export interface WorkloadWindow {
  from: Date;
  to: Date;
}

export const WORKLOAD_RANGES = ['week', 'month', 'year'] as const;

export type WorkloadRange = (typeof WORKLOAD_RANGES)[number];

/**
 * A month back is the default: a week is too few shifts to tell a heavy roster
 * from an ordinary one, and a year buries this month under last winter's.
 */
export const DEFAULT_WORKLOAD_RANGE: WorkloadRange = 'month';

/**
 * Midnight in Israel, `months` calendar months before a date, clamped.
 *
 * Naive month arithmetic on the 31st lands on the 3rd of the *current* month,
 * which would silently shorten the window to three days for anyone opening the
 * app on the 31st. One month back from the 31st of March is the last day of
 * February.
 */
function midnightMonthsBack(year: number, month: number, day: number, months: number): Date {
  const monthIndex = month - 1 - months;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonth = (((monthIndex % 12) + 12) % 12) + 1;
  // Day 0 of the following month is the last day of this one.
  const lastDayOfTarget = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  return israelMidnight(targetYear, targetMonth, Math.min(day, lastDayOfTarget));
}

/**
 * The window for a range, measured backwards from `now` to the end of today.
 *
 * Backwards only: a "load" is work already carried, and counting the roster
 * ahead would make a worker's hours jump the moment scheduling uploads next
 * week's workbook. What is still coming is what the schedule card is for.
 */
export function workloadWindowFor(range: WorkloadRange, now: Date = new Date()): WorkloadWindow {
  const { year, month, day } = israelParts(now);

  // The last instant of today in Israel, taken as one millisecond before
  // tomorrow's midnight so a DST change cannot move it.
  const to = new Date(israelMidnight(year, month, day + 1).getTime() - 1);

  switch (range) {
    case 'week':
      return { from: israelMidnight(year, month, day - 7), to };
    case 'month':
      return { from: midnightMonthsBack(year, month, day, 1), to };
    case 'year':
      return { from: midnightMonthsBack(year, month, day, 12), to };
  }
}

/** Anything that is not one of the three ranges falls back to the default. */
export function parseWorkloadRange(value: unknown): WorkloadRange {
  return WORKLOAD_RANGES.includes(value as WorkloadRange)
    ? (value as WorkloadRange)
    : DEFAULT_WORKLOAD_RANGE;
}
