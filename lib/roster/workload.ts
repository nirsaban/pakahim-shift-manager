// Workload metrics for one inspector over a window of shifts.
//
// Pure like the rest of lib/roster/: no prisma, no Next runtime, so the rules
// that decide "this is a night shift" or "this rest gap is too short" can be
// tested directly. The service layer feeds it rows and adds the DB queries.

/** The shift shape these metrics need - a subset of the Shift model. */
export interface WorkloadShift {
  startTime: Date;
  endTime: Date;
  status: string;
}

/**
 * A rest gap shorter than the legal minimum, between two consecutive shifts.
 * Reported rather than silently averaged away: this is the one metric a
 * scheduler has to act on.
 */
export interface RestWarning {
  previousEnd: Date;
  nextStart: Date;
  gapMinutes: number;
}

export interface WorkloadMetrics {
  /** Shifts actually worked - SICK / HOLIDAY / CANCELLED are counted separately. */
  shiftCount: number;
  absenceCount: number;
  totalMinutes: number;
  /** Null rather than 0 when nothing was worked, so the UI can say "no data". */
  averageMinutes: number | null;
  longestMinutes: number | null;
  nightShiftCount: number;
  weekendShiftCount: number;
  /** Distinct calendar days with at least one worked shift. */
  daysWorked: number;
  /** Longest run of consecutive calendar days worked. */
  longestStreakDays: number;
  restWarnings: RestWarning[];
}

/**
 * Israel's Hours of Work and Rest Law requires 8 hours between one workday and
 * the next. A roster that breaks it is a scheduling error, not a preference.
 */
export const MIN_REST_MINUTES = 8 * 60;

/** Night work runs midnight to 05:00 - the window that carries the premium. */
const NIGHT_END_HOUR = 5;

/** SICK / HOLIDAY rows exist so a worker can see their replacement; they are not work. */
const ABSENCE_STATUSES = new Set(['SICK', 'HOLIDAY']);

function dayStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * Does any minute of the shift fall between midnight and 05:00?
 *
 * Checked against the night window of both the start day and the day after, so
 * a 22:00-06:00 shift counts even though it starts in the evening.
 */
function overlapsNight(start: Date, end: Date): boolean {
  const base = dayStart(start);
  for (let offset = 0; offset <= 1; offset++) {
    const nightStart = new Date(base);
    nightStart.setDate(nightStart.getDate() + offset);
    const nightEnd = new Date(nightStart);
    nightEnd.setHours(NIGHT_END_HOUR);
    if (start < nightEnd && end > nightStart) return true;
  }
  return false;
}

/** The Israeli weekend: Friday and Saturday, taken from the day the shift starts. */
function isWeekend(start: Date): boolean {
  const day = start.getDay();
  return day === 5 || day === 6;
}

function minutesBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 60_000);
}

/**
 * Summarise one worker's shifts.
 *
 * CANCELLED rows are ignored outright - they never happened. SICK and HOLIDAY
 * are counted as absences and excluded from every duration metric, so a week of
 * sick leave reads as "0 shifts, 5 absences" rather than as a light week.
 */
export function computeWorkload(shifts: WorkloadShift[]): WorkloadMetrics {
  const worked = shifts
    .filter((s) => s.status !== 'CANCELLED' && !ABSENCE_STATUSES.has(s.status))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const absenceCount = shifts.filter((s) => ABSENCE_STATUSES.has(s.status)).length;

  const durations = worked.map((s) => Math.max(0, minutesBetween(s.startTime, s.endTime)));
  const totalMinutes = durations.reduce((sum, m) => sum + m, 0);

  const restWarnings: RestWarning[] = [];
  for (let i = 1; i < worked.length; i++) {
    const previousEnd = worked[i - 1].endTime;
    const nextStart = worked[i].startTime;
    const gapMinutes = minutesBetween(previousEnd, nextStart);
    // A negative gap means the two shifts overlap - a data error, but it is
    // still a rest violation and the scheduler should see it.
    if (gapMinutes < MIN_REST_MINUTES) restWarnings.push({ previousEnd, nextStart, gapMinutes });
  }

  const days = [...new Set(worked.map((s) => dayKey(dayStart(s.startTime))))];
  const dayStamps = [...new Set(worked.map((s) => dayStart(s.startTime).getTime()))].sort((a, b) => a - b);

  let longestStreakDays = 0;
  let streak = 0;
  for (let i = 0; i < dayStamps.length; i++) {
    const previous = i > 0 ? new Date(dayStamps[i - 1]) : null;
    if (previous) {
      const expected = new Date(previous);
      expected.setDate(expected.getDate() + 1);
      streak = expected.getTime() === dayStamps[i] ? streak + 1 : 1;
    } else {
      streak = 1;
    }
    if (streak > longestStreakDays) longestStreakDays = streak;
  }

  return {
    shiftCount: worked.length,
    absenceCount,
    totalMinutes,
    averageMinutes: worked.length > 0 ? Math.round(totalMinutes / worked.length) : null,
    longestMinutes: durations.length > 0 ? Math.max(...durations) : null,
    nightShiftCount: worked.filter((s) => overlapsNight(s.startTime, s.endTime)).length,
    weekendShiftCount: worked.filter((s) => isWeekend(s.startTime)).length,
    daysWorked: days.length,
    longestStreakDays,
    restWarnings,
  };
}

/**
 * Where one worker sits against the rest of their team.
 *
 * The point of the metric: a roster is "fair" only relative to everyone else's,
 * so a raw hour count means nothing on its own. Null when the team has nobody
 * else to compare against.
 */
export function compareToTeam(
  own: WorkloadMetrics,
  teamMetrics: WorkloadMetrics[],
): { teamAverageMinutes: number; differenceMinutes: number } | null {
  const others = teamMetrics.filter((m) => m.shiftCount > 0);
  if (others.length === 0) return null;
  const teamAverageMinutes = Math.round(
    others.reduce((sum, m) => sum + m.totalMinutes, 0) / others.length,
  );
  return { teamAverageMinutes, differenceMinutes: own.totalMinutes - teamAverageMinutes };
}
