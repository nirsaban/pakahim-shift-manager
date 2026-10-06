import { prisma } from '../db/prisma';
import { pickRosterDay } from '../driver-roster/display';
import { dayHandoffs, type Handoff } from '../driver-roster/handoffs';
import { startOfIsraelDay } from '../time/zone';
import { formatWorkerName } from '../utils/display-name';

/**
 * What a locomotive driver's home screen shows: their own upcoming shifts,
 * and one published roster day of the whole team with contact details.
 * Every query is scoped to the tenant passed in.
 */

export interface DriverShiftView {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  serial: number | null;
  /** The weekly report's link, "D01", for a line it wrote. */
  link: string | null;
  originStation: string | null;
  mirs: string | null;
  task: string | null;
  trainNumbers: string[];
  companion: { role: string; name: string; workerNumber: string | null; mirs: string | null } | null;
  /** SCHEDULED / STARTED, or SICK / HOLIDAY once the roster admin has arranged cover. */
  status: string;
  /** Who covers this shift, when someone does. */
  replacement: { name: string; phone: string | null; city: string | null } | null;
}

/**
 * A driver's shifts that have not ended yet, soonest first. SICK and HOLIDAY
 * stay in, as on the פקחים dashboard: a driver who is out still needs to see
 * that cover was arranged and who it is.
 */
export async function getUpcomingDriverShifts(workerId: string, now: Date, limit = 4): Promise<DriverShiftView[]> {
  const shifts = await prisma.shift.findMany({
    where: { workerId, endTime: { gt: now }, status: { in: ['SCHEDULED', 'STARTED', 'SICK', 'HOLIDAY'] } },
    orderBy: { startTime: 'asc' },
    take: limit,
    include: { driverDuty: true, replacement: true },
  });
  return shifts.map((s) => {
    const duty = s.driverDuty;
    return {
      id: s.id,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      serial: duty?.serial ?? null,
      link: duty?.link ?? null,
      originStation: duty?.originStation ?? null,
      mirs: duty?.mirs ?? null,
      task: duty?.task ?? null,
      trainNumbers: duty?.trainNumbers ?? [],
      companion:
        duty?.companionName && duty.companionRole
          ? {
              role: duty.companionRole,
              name: duty.companionName,
              workerNumber: duty.companionWorkerNumber,
              mirs: duty.companionMirs,
            }
          : null,
      status: s.status,
      replacement: s.replacement
        ? { name: formatWorkerName(s.replacement), phone: s.replacement.phone, city: s.replacement.city }
        : null,
    };
  });
}

export interface DirectoryEntry {
  id: string;
  name: string;
  workerNumber: string | null;
  phone: string | null;
  city: string | null;
  /** Their shift on the roster day shown, if they have one. */
  shift: DayShift | null;
}

/** A partner in a handoff, as shown to a driver. */
export interface HandoffPartner {
  name: string;
  phone: string | null;
  trainNumber: string;
  station: string | null;
  startTime: Date;
  endTime: Date;
}

/** One shift of a roster day: the work and who it changes hands with. */
export interface DayShift {
  shiftId: string;
  startTime: Date;
  endTime: Date;
  originStation: string | null;
  mirs: string | null;
  task: string | null;
  trainNumbers: string[];
  companion: string | null;
  /** "אני מחליף את" - drivers this shift takes a train over from. */
  takesOverFrom: HandoffPartner[];
  /** "מחליף אותי" - drivers this shift hands a train to. */
  handsOverTo: HandoffPartner[];
}

/** Every shift of one roster day, by worker, with the day's handoffs worked out. */
export async function loadRosterDay(tenantId: string, day: Date): Promise<Map<string, DayShift>> {
  const shifts = await prisma.shift.findMany({
    where: { tenantId, date: day },
    include: { driverDuty: true, worker: true },
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
  const byShift = new Map(shifts.map((s) => [s.id, s]));
  const partner = (h: Handoff): HandoffPartner => {
    const other = byShift.get(h.shiftId)!;
    return {
      name: formatWorkerName(other.worker),
      phone: other.worker.phone,
      trainNumber: h.trainNumber,
      station: h.station,
      startTime: other.startTime,
      endTime: other.endTime,
    };
  };

  // A driver with two lines that day is shown at their first.
  const byWorker = new Map<string, DayShift>();
  for (const s of shifts) {
    if (byWorker.has(s.workerId)) continue;
    const duty = s.driverDuty;
    const h = handoffs.get(s.id);
    byWorker.set(s.workerId, {
      shiftId: s.id,
      startTime: s.startTime,
      endTime: s.endTime,
      originStation: duty?.originStation ?? null,
      mirs: duty?.mirs ?? null,
      task: duty?.task ?? null,
      trainNumbers: duty?.trainNumbers ?? [],
      companion:
        duty?.companionRole && duty.companionName
          ? `${duty.companionRole} ${duty.companionName}${duty.companionWorkerNumber ? ` (${duty.companionWorkerNumber})` : ''}`
          : null,
      takesOverFrom: (h?.takesOverFrom ?? []).map(partner),
      handsOverTo: (h?.handsOverTo ?? []).map(partner),
    });
  }
  return byWorker;
}

export interface DriverDirectory {
  /** The roster day the shifts belong to; null before any roster is published. */
  day: Date | null;
  /** Every driver: those on shift that day first, by start time, then the rest by name. */
  entries: DirectoryEntry[];
  /** The day's shifts by worker, for callers that need more than the list. */
  byWorker: Map<string, DayShift>;
}

export async function getDriverDirectory(tenantId: string, now: Date): Promise<DriverDirectory> {
  // The candidate days: today and later, plus the latest earlier one to fall back on.
  const today = startOfIsraelDay(now);
  const [ahead, before] = await Promise.all([
    prisma.shift.findMany({
      where: { tenantId, date: { gte: today } },
      distinct: ['date'],
      select: { date: true },
      orderBy: { date: 'asc' },
      take: 2,
    }),
    prisma.shift.findFirst({ where: { tenantId, date: { lt: today } }, select: { date: true }, orderBy: { date: 'desc' } }),
  ]);
  const day = pickRosterDay([...ahead, ...(before ? [before] : [])].map((s) => s.date), now);

  const [drivers, shiftByWorker] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId, role: 'DRIVER' },
      select: { id: true, firstName: true, lastName: true, workerNumber: true, phone: true, city: true },
    }),
    day ? loadRosterDay(tenantId, day) : Promise.resolve(new Map<string, DayShift>()),
  ]);

  const entries: DirectoryEntry[] = drivers.map((d) => ({
    id: d.id,
    name: formatWorkerName(d),
    workerNumber: d.workerNumber,
    phone: d.phone,
    city: d.city,
    shift: shiftByWorker.get(d.id) ?? null,
  }));
  entries.sort((a, b) => {
    if (a.shift && b.shift) return a.shift.startTime.getTime() - b.shift.startTime.getTime();
    if (a.shift || b.shift) return a.shift ? -1 : 1;
    return a.name.localeCompare(b.name, 'he');
  });

  return { day, entries, byWorker: shiftByWorker };
}

