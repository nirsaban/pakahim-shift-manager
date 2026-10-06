import { prisma } from '../db/prisma';
import { dayHandoffs, taskSteps, type Step } from '../driver-roster/handoffs';
import { pickRosterDay } from '../driver-roster/display';
import { israelDateKey, israelMidnight, startOfIsraelDay, addIsraelDays } from '../time/zone';
import { formatWorkerName } from '../utils/display-name';

/**
 * The data behind the drivers' browsing pages: a roster day, a shift, a
 * driver, a train, a station. Every function takes the drivers' tenant and
 * never reads outside it.
 */

export interface PersonRef {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  workerNumber: string | null;
}

export interface HandoffRef {
  shiftId: string;
  person: PersonRef;
  trainNumber: string;
  station: string | null;
  startTime: Date;
  endTime: Date;
}

export interface ShiftDetail {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  status: string;
  /** Which report wrote it: the daily is the more up-to-date. */
  source: 'DAILY' | 'WEEKLY' | null;
  serial: number | null;
  link: string | null;
  originStation: string | null;
  mirs: string | null;
  task: string | null;
  steps: Step[];
  trainNumbers: string[];
  companion: { role: string; name: string; workerNumber: string | null; mirs: string | null } | null;
  worker: PersonRef;
  replacement: PersonRef | null;
  /** Drivers this shift takes a train over from - "מחליף את". */
  takesOverFrom: HandoffRef[];
  /** Drivers this shift hands a train to - "מוחלף על ידי". */
  handsOverTo: HandoffRef[];
}

type UserRow = { id: string; firstName: string | null; lastName: string | null; phone: string | null; city: string | null; workerNumber: string | null };

const person = (u: UserRow): PersonRef => ({
  id: u.id,
  name: formatWorkerName(u),
  phone: u.phone,
  city: u.city,
  workerNumber: u.workerNumber,
});

/** "2026-10-07" from a URL to that day's Israel midnight; null when it is not a date. */
export function parseDayParam(value: unknown): Date | null {
  const m = typeof value === 'string' ? value.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return israelMidnight(y, mo, d);
}

/** The URL form of a roster day. */
export const dayParam = (day: Date) => israelDateKey(day);

/** Every shift of one roster day, in start order, each with its handoffs. */
export async function loadDayShifts(tenantId: string, day: Date): Promise<ShiftDetail[]> {
  const shifts = await prisma.shift.findMany({
    where: { tenantId, date: day },
    include: { driverDuty: true, worker: true, replacement: true },
    orderBy: { startTime: 'asc' },
  });
  const handoffs = dayHandoffs(
    shifts.map((s) => ({
      shiftId: s.id,
      workerId: s.workerId,
      startTime: s.startTime,
      originStation: s.driverDuty?.originStation ?? null,
      task: s.driverDuty?.task ?? '',
    })),
  );
  const byId = new Map(shifts.map((s) => [s.id, s]));

  return shifts.map((s) => {
    const duty = s.driverDuty;
    const h = handoffs.get(s.id);
    const ref = (x: { shiftId: string; trainNumber: string; station: string | null }): HandoffRef => {
      const other = byId.get(x.shiftId)!;
      return {
        shiftId: x.shiftId,
        person: person(other.worker),
        trainNumber: x.trainNumber,
        station: x.station,
        startTime: other.startTime,
        endTime: other.endTime,
      };
    };
    return {
      id: s.id,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
      source: duty?.source ?? null,
      serial: duty?.serial ?? null,
      link: duty?.link ?? null,
      originStation: duty?.originStation ?? null,
      mirs: duty?.mirs ?? null,
      task: duty?.task ?? null,
      steps: duty?.task ? taskSteps(duty.task) : [],
      trainNumbers: duty?.trainNumbers ?? [],
      companion:
        duty?.companionRole && duty.companionName
          ? { role: duty.companionRole, name: duty.companionName, workerNumber: duty.companionWorkerNumber, mirs: duty.companionMirs }
          : null,
      worker: person(s.worker),
      replacement: s.replacement ? person(s.replacement) : null,
      takesOverFrom: (h?.takesOverFrom ?? []).map(ref),
      handsOverTo: (h?.handsOverTo ?? []).map(ref),
    };
  });
}

/** One shift, with the handoffs of its day. Null when it is not this tenant's. */
export async function getShiftDetail(tenantId: string, shiftId: string): Promise<ShiftDetail | null> {
  const shift = await prisma.shift.findUnique({ where: { id: shiftId }, select: { tenantId: true, date: true } });
  if (!shift || shift.tenantId !== tenantId) return null;
  return (await loadDayShifts(tenantId, shift.date)).find((s) => s.id === shiftId) ?? null;
}

export interface PublishedDay {
  date: Date;
  shiftCount: number;
}

/** Every day that has a published roster, oldest first. */
export async function getPublishedDays(tenantId: string): Promise<PublishedDay[]> {
  const rows = await prisma.shift.groupBy({ by: ['date'], where: { tenantId }, _count: { _all: true }, orderBy: { date: 'asc' } });
  return rows.map((r) => ({ date: r.date, shiftCount: r._count._all }));
}

/** The roster day to open by default: today's, else the next published, else the latest. */
export function defaultDay(days: PublishedDay[], now: Date): Date | null {
  return pickRosterDay(days.map((d) => d.date), now);
}

export interface ShiftSummary {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  status: string;
  source: 'DAILY' | 'WEEKLY' | null;
  originStation: string | null;
  link: string | null;
  serial: number | null;
  /** Who covers it, when someone does. */
  replacementName: string | null;
}

/** A driver's shifts in a window, start order. */
export async function getShiftsOf(tenantId: string, workerId: string, from: Date, to: Date): Promise<ShiftSummary[]> {
  const shifts = await prisma.shift.findMany({
    where: { tenantId, workerId, startTime: { gte: from, lt: to } },
    include: { driverDuty: true, replacement: true },
    orderBy: { startTime: 'asc' },
  });
  return shifts.map((s) => ({
    id: s.id,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    status: s.status,
    source: s.driverDuty?.source ?? null,
    originStation: s.driverDuty?.originStation ?? null,
    link: s.driverDuty?.link ?? null,
    serial: s.driverDuty?.serial ?? null,
    replacementName: s.replacement ? formatWorkerName(s.replacement) : null,
  }));
}

/** A driver of this tenant, or null. */
export async function getDriver(tenantId: string, userId: string): Promise<(PersonRef & { registered: boolean }) | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.tenantId !== tenantId || user.role !== 'DRIVER') return null;
  return { ...person(user), registered: Boolean(user.email) };
}

/** Every driver of the tenant, by name. */
export async function listDriverPeople(tenantId: string): Promise<PersonRef[]> {
  const users = await prisma.user.findMany({ where: { tenantId, role: 'DRIVER' }, orderBy: { firstName: 'asc' } });
  return users.map(person);
}

/** A window around today for a driver's own list: a week back, three ahead. */
export function scheduleWindow(now: Date): { from: Date; to: Date } {
  const today = startOfIsraelDay(now);
  return { from: addIsraelDays(today, -7), to: addIsraelDays(today, 22) };
}

export interface TrainLeg {
  shift: ShiftDetail;
  passenger: boolean;
  /** Where this driver is just before and after the train, read off the task. */
  from: string | null;
  to: string | null;
}

/** Everyone on one train on one day - drivers in their order on it, then passengers. */
export async function getTrainDay(tenantId: string, day: Date, trainNumber: string): Promise<TrainLeg[]> {
  const shifts = await loadDayShifts(tenantId, day);
  const legs: TrainLeg[] = [];
  for (const shift of shifts) {
    const at = shift.steps.findIndex((s) => s.kind === 'train' && s.number === trainNumber);
    if (at < 0) continue;
    const step = shift.steps[at] as Extract<Step, { kind: 'train' }>;
    const place = (i: number) => {
      const s = shift.steps[i];
      return s?.kind === 'place' ? s.name : null;
    };
    legs.push({ shift, passenger: step.passenger, from: place(at - 1), to: place(at + 1) });
  }
  // A train passes from driver to driver: whoever takes it over comes after.
  const order = (l: TrainLeg) => (l.shift.takesOverFrom.some((h) => h.trainNumber === trainNumber) ? 1 : 0);
  return legs.sort(
    (a, b) => Number(a.passenger) - Number(b.passenger) || order(a) - order(b) || a.shift.startTime.getTime() - b.shift.startTime.getTime(),
  );
}

export interface StationDay {
  /** Shifts whose day starts here. */
  starting: ShiftDetail[];
  /** Trains changing hands here. */
  handoffs: { train: string; from: HandoffRef; to: ShiftDetail }[];
}

/** One station on one day: who starts there, and which trains change hands there. */
export async function getStationDay(tenantId: string, day: Date, station: string): Promise<StationDay> {
  const shifts = await loadDayShifts(tenantId, day);
  return {
    starting: shifts.filter((s) => s.originStation === station),
    handoffs: shifts.flatMap((s) =>
      s.takesOverFrom.filter((h) => h.station === station).map((h) => ({ train: h.trainNumber, from: h, to: s })),
    ),
  };
}
