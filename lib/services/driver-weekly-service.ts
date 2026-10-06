import { prisma } from '../db/prisma';
import { he } from '../he';
import type { PdfTextItem } from '../driver-roster/pdf';
import { parseWeeklyRoster, type WeeklyRosterCell } from '../driver-roster/weekly';
import { matchDriverName } from '../driver-roster/name-match';
import { shiftWindow } from '../driver-roster/roster-plan';
import { formatIsraelDate, israelMidnight } from '../time/zone';
import { formatWorkerName } from '../utils/display-name';
import { notify } from './push-service';
import { DRIVERS_SOUTH_TEAM } from './driver-contacts-service';

/**
 * Reads the drivers' weekly link report and, when asked, publishes it - a
 * week of shifts in one file. The same call previews (publish: false) and
 * publishes, as for the daily report.
 *
 * - Drivers are found by name: the report has no worker numbers (name-match.ts).
 *   Names that match no driver, or more than one, are listed, not guessed.
 * - A day already published from the daily report is left alone: the daily is
 *   the newer, corrected roster. A later daily upload replaces a weekly day.
 * - A re-upload keeps each driver's shift on a day, so reminders are not sent
 *   twice, exactly as the daily import does.
 */

export interface WeeklyDaySummary {
  /** dd/mm/yyyy */
  date: string;
  /** "יום שני, 05.10" */
  label: string;
  shiftCount: number;
  restCount: number;
  newShiftCount: number;
  updatedShiftCount: number;
  removedShiftCount: number;
  /** Set when the day is left alone because the daily report already covers it. */
  skippedForDaily: boolean;
}

export interface WeeklyRosterSummary {
  kind: 'weekly';
  /** "03/10/2026 – 09/10/2026" */
  range: string;
  driverCount: number;
  matchedCount: number;
  days: WeeklyDaySummary[];
  /** Spelled differently from the driver list, matched anyway. Shown so a wrong pairing would be noticed. */
  nearMatches: { name: string; matchedName: string }[];
  /** Not published: no driver by that name, or more than one. */
  unmatched: { link: string; name: string; reason: 'none' | 'ambiguous' }[];
  warnings: string[];
}

export type WeeklyRosterResult = { ok: true; summary: WeeklyRosterSummary } | { ok: false; error: string };

const pad = (n: number) => String(n).padStart(2, '0');

export async function importWeeklyRoster(input: {
  tenantId: string;
  uploadedBy: string;
  filename: string;
  pages: Pick<PdfTextItem, 'str' | 'x' | 'y' | 'width' | 'dir'>[][];
  publish: boolean;
}): Promise<WeeklyRosterResult> {
  const parsed = parseWeeklyRoster(input.pages);
  if (parsed.days.length === 0) return { ok: false, error: he.drivers.upload.errors.noDate };
  if (parsed.rows.length === 0) return { ok: false, error: he.drivers.upload.errors.noRows };

  const team = await prisma.team.findUnique({
    where: { tenantId_name: { tenantId: input.tenantId, name: DRIVERS_SOUTH_TEAM } },
  });
  if (!team) return { ok: false, error: he.drivers.upload.errors.noTeam };

  const drivers = await prisma.user.findMany({
    where: { tenantId: input.tenantId, role: 'DRIVER' },
    select: { id: true, firstName: true, lastName: true },
  });
  const named = drivers.map((d) => ({ id: d.id, name: formatWorkerName(d) }));

  // Each row to a driver, or onto the list of names nobody could be sure of.
  const summary: WeeklyRosterSummary = {
    kind: 'weekly',
    range: `${fmtDate(parsed.days[0])} – ${fmtDate(parsed.days[parsed.days.length - 1])}`,
    driverCount: parsed.rows.length,
    matchedCount: 0,
    days: [],
    nearMatches: [],
    unmatched: [],
    warnings: parsed.warnings,
  };
  const matched: { workerId: string; link: string; shifts: WeeklyRosterCell[]; restDays: number[] }[] = [];
  for (const row of parsed.rows) {
    const match = matchDriverName(row.workerName, named);
    if (match.kind === 'exact' || match.kind === 'near') {
      if (match.kind === 'near') summary.nearMatches.push({ name: row.workerName, matchedName: match.matchedName });
      matched.push({ workerId: match.driverId, link: row.link, shifts: row.shifts, restDays: row.restDays });
    } else {
      summary.unmatched.push({ link: row.link, name: row.workerName, reason: match.kind });
    }
  }
  summary.matchedCount = matched.length;

  const dayDates = parsed.days.map((d) => israelMidnight(d.year, d.month, d.day));
  const existing = await prisma.shift.findMany({
    where: { tenantId: input.tenantId, date: { in: dayDates } },
    select: { id: true, workerId: true, date: true, startTime: true, endTime: true, driverDuty: { select: { source: true } } },
    orderBy: { startTime: 'asc' },
  });

  type Planned = { workerId: string; link: string; cell: WeeklyRosterCell; existingShiftId: string | null };
  const plans = parsed.days.map((_, day) => {
    const date = dayDates[day];
    const before = existing.filter((s) => s.date.getTime() === date.getTime());
    const skippedForDaily = before.some((s) => s.driverDuty?.source === 'DAILY');
    const wanted = matched.flatMap((m) => m.shifts.filter((c) => c.day === day).map((cell) => ({ workerId: m.workerId, link: m.link, cell })));

    // Pair each driver's lines with their existing shifts in order, as the daily plan does.
    const pool = new Map<string, string[]>();
    for (const s of before) pool.set(s.workerId, [...(pool.get(s.workerId) ?? []), s.id]);
    const shifts: Planned[] = wanted.map((w) => ({ ...w, existingShiftId: pool.get(w.workerId)?.shift() ?? null }));
    const kept = new Set(shifts.map((s) => s.existingShiftId).filter(Boolean));
    const remove = before.filter((s) => !kept.has(s.id));

    summary.days.push({
      date: fmtDate(parsed.days[day]),
      label: formatIsraelDate(date, { weekday: 'long', day: '2-digit', month: '2-digit' }),
      shiftCount: wanted.length,
      restCount: matched.filter((m) => m.restDays.includes(day)).length,
      newShiftCount: skippedForDaily ? 0 : shifts.filter((s) => !s.existingShiftId).length,
      updatedShiftCount: skippedForDaily ? 0 : shifts.filter((s) => s.existingShiftId).length,
      removedShiftCount: skippedForDaily ? 0 : remove.length,
      skippedForDaily,
    });
    return { day, date, skippedForDaily, shifts, remove, before };
  });

  if (!input.publish) return { ok: true, summary };

  const published = plans.filter((p) => !p.skippedForDaily);
  await prisma.$transaction(
    async (tx) => {
      for (const plan of published) {
        if (plan.remove.length > 0) {
          await tx.shift.deleteMany({ where: { tenantId: input.tenantId, id: { in: plan.remove.map((s) => s.id) } } });
        }
        for (const { workerId, link, cell, existingShiftId } of plan.shifts) {
          const window = shiftWindow(parsed.days[plan.day], cell);
          const duty = {
            serial: null,
            link,
            source: 'WEEKLY' as const,
            mirs: null,
            originStation: cell.originStation,
            task: cell.task,
            trainNumbers: cell.trainNumbers,
            companionRole: null,
            companionName: null,
            companionWorkerNumber: null,
            companionMirs: null,
          };
          const shift = { workerId, teamId: team.id, ...window, region: team.name };
          if (existingShiftId) {
            await tx.shift.update({
              where: { id: existingShiftId },
              data: { ...shift, driverDuty: { upsert: { create: { tenantId: input.tenantId, ...duty }, update: duty } } },
            });
          } else {
            await tx.shift.create({
              data: { tenantId: input.tenantId, ...shift, driverDuty: { create: { tenantId: input.tenantId, ...duty } } },
            });
          }
        }
      }
      await tx.shiftFile.create({
        data: {
          tenantId: input.tenantId,
          filename: input.filename,
          fileUrl: `local://${input.filename}`,
          uploadedBy: input.uploadedBy,
          status: 'IMPORTED',
          importedShiftCount: published.reduce((n, p) => n + p.shifts.length, 0),
          importedDates: published.map((p) => p.date),
          errorMessage: summary.unmatched.length > 0 ? he.drivers.upload.weekly.unmatchedNote(summary.unmatched.length) : null,
        },
      });
    },
    // A week is ~700 lines; give it room.
    { timeout: 120_000 },
  );

  notifyWeekChanges(published, parsed.days);
  return { ok: true, summary };
}

function fmtDate(d: { day: number; month: number; year: number }): string {
  return `${pad(d.day)}/${pad(d.month)}/${d.year}`;
}

/**
 * One push per driver per kind of change, naming the days - as the פקחים
 * import does for a multi-day file. Unchanged days send nothing.
 */
function notifyWeekChanges(
  plans: {
    day: number;
    date: Date;
    shifts: { workerId: string; cell: WeeklyRosterCell; existingShiftId: string | null }[];
    remove: { id: string; workerId: string }[];
    before: { id: string; startTime: Date; endTime: Date }[];
  }[],
  days: { year: number; month: number; day: number }[],
): void {
  const assigned = new Map<string, Date[]>();
  const changed = new Map<string, Date[]>();
  const removed = new Map<string, Date[]>();
  const add = (log: Map<string, Date[]>, id: string, date: Date) => log.set(id, [...(log.get(id) ?? []), date]);

  for (const plan of plans) {
    const before = new Map(plan.before.map((s) => [s.id, s]));
    const stillOn = new Set<string>();
    for (const s of plan.shifts) {
      stillOn.add(s.workerId);
      const previous = s.existingShiftId ? before.get(s.existingShiftId) : undefined;
      if (!previous) {
        add(assigned, s.workerId, plan.date);
        continue;
      }
      const w = shiftWindow(days[plan.day], s.cell);
      if (w.startTime.getTime() !== previous.startTime.getTime() || w.endTime.getTime() !== previous.endTime.getTime()) {
        add(changed, s.workerId, plan.date);
      }
    }
    for (const r of plan.remove) if (!stillOn.has(r.workerId)) add(removed, r.workerId, plan.date);
  }

  const label = (dates: Date[]) => {
    const short = (d: Date) => formatIsraelDate(d, { day: '2-digit', month: '2-digit' });
    if (dates.length === 1) return formatIsraelDate(dates[0], { weekday: 'long', day: '2-digit', month: '2-digit' });
    return he.push.multipleDays(dates.length, short(dates[0]), short(dates[dates.length - 1]));
  };
  const send = (log: Map<string, Date[]>, copy: { title: string; body: (when: string) => string }) => {
    const byWhen = new Map<string, string[]>();
    for (const [workerId, dates] of log) {
      const when = label(dates);
      byWhen.set(when, [...(byWhen.get(when) ?? []), workerId]);
    }
    for (const [when, ids] of byWhen) notify(ids, { title: copy.title, body: copy.body(when), url: '/drivers', tag: 'roster-import' });
  };
  send(assigned, he.push.shiftAssigned);
  send(changed, he.push.shiftChanged);
  send(removed, he.push.shiftRemoved);
}
