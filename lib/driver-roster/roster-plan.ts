import { israelMidnight, israelTime } from '../time/zone';
import type { DriverRosterRow } from './roster';

/**
 * What publishing a parsed roster day would do, worked out before anything is
 * written - the upload's preview shows it, and publish applies exactly it.
 *
 * A re-upload ("מעודכן" - the department sends corrected files the same day)
 * keeps each driver's shift rather than replacing it: pre-shift reminders are
 * de-duplicated per shift id, so a fresh id would remind the driver twice.
 *
 * Pure (no Prisma) so the rules are tested on their own.
 */

export interface RosterDate {
  year: number;
  month: number;
  day: number;
}

export interface ShiftWindow {
  date: Date;
  startTime: Date;
  endTime: Date;
}

/**
 * The instants a row's shift covers, in Israel time. A shift that ends at or
 * before its start time ends the next day ("17:35" to "00:40").
 */
export function shiftWindow(date: RosterDate, row: Pick<DriverRosterRow, 'startMinutes' | 'endMinutes'>): ShiftWindow {
  const overnight = row.endMinutes <= row.startMinutes;
  return {
    date: israelMidnight(date.year, date.month, date.day),
    startTime: israelTime(date.year, date.month, date.day, row.startMinutes),
    // Day + 1 past the month's end rolls over: israelTime builds on Date.UTC.
    endTime: israelTime(date.year, date.month, date.day + (overnight ? 1 : 0), row.endMinutes),
  };
}

export interface ExistingDriverShift {
  id: string;
  workerId: string;
}

export interface PlannedShift {
  row: DriverRosterRow;
  /** The driver, when already on file; null when publishing creates them. */
  workerId: string | null;
  /** The shift this row updates; null for a new one. */
  existingShiftId: string | null;
}

export interface RosterPublishPlan {
  shifts: PlannedShift[];
  /** Drivers on the roster but not in the contact list. Created so the roster is whole; they cannot log in until given a phone. */
  newDrivers: { workerNumber: string; name: string }[];
  /** Shifts of that day the new file no longer has. */
  removeShiftIds: string[];
  /** Rows with no worker number, which cannot be tied to anyone. */
  unlinked: DriverRosterRow[];
}

export function planRosterPublish(
  rows: DriverRosterRow[],
  driverIdByNumber: Map<string, string>,
  existing: ExistingDriverShift[],
): RosterPublishPlan {
  // A driver may hold two lines in a day; pair them up with their existing
  // shifts in order rather than letting the second line steal the first's id.
  const existingByWorker = new Map<string, string[]>();
  for (const shift of existing) {
    existingByWorker.set(shift.workerId, [...(existingByWorker.get(shift.workerId) ?? []), shift.id]);
  }

  const plan: RosterPublishPlan = { shifts: [], newDrivers: [], removeShiftIds: [], unlinked: [] };
  const kept = new Set<string>();

  for (const row of rows) {
    if (!row.workerNumber) {
      plan.unlinked.push(row);
      continue;
    }
    const workerId = driverIdByNumber.get(row.workerNumber) ?? null;
    if (!workerId) {
      if (!plan.newDrivers.some((d) => d.workerNumber === row.workerNumber)) {
        plan.newDrivers.push({ workerNumber: row.workerNumber, name: row.workerName });
      }
      plan.shifts.push({ row, workerId: null, existingShiftId: null });
      continue;
    }
    const existingShiftId = existingByWorker.get(workerId)?.shift() ?? null;
    if (existingShiftId) kept.add(existingShiftId);
    plan.shifts.push({ row, workerId, existingShiftId });
  }

  plan.removeShiftIds = existing.filter((s) => !kept.has(s.id)).map((s) => s.id);
  return plan;
}
