import { prisma } from '../db/prisma';
import { pickRosterDay } from '../driver-roster/display';
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
  originStation: string | null;
  mirs: string | null;
  task: string | null;
  trainNumbers: string[];
  companion: { role: string; name: string; workerNumber: string | null; mirs: string | null } | null;
}

/** A driver's shifts that have not ended yet, soonest first. */
export async function getUpcomingDriverShifts(workerId: string, now: Date, limit = 4): Promise<DriverShiftView[]> {
  const shifts = await prisma.shift.findMany({
    where: { workerId, endTime: { gt: now }, status: { in: ['SCHEDULED', 'STARTED'] } },
    orderBy: { startTime: 'asc' },
    take: limit,
    include: { driverDuty: true },
  });
  return shifts.map((s) => {
    const duty = s.driverDuty;
    return {
      id: s.id,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      serial: duty?.serial ?? null,
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
  shift: { startTime: Date; endTime: Date; originStation: string | null } | null;
}

export interface DriverDirectory {
  /** The roster day the shifts belong to; null before any roster is published. */
  day: Date | null;
  /** Every driver: those on shift that day first, by start time, then the rest by name. */
  entries: DirectoryEntry[];
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

  const [drivers, shifts] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId, role: 'DRIVER' },
      select: { id: true, firstName: true, lastName: true, workerNumber: true, phone: true, city: true },
    }),
    day
      ? prisma.shift.findMany({
          where: { tenantId, date: day },
          select: { workerId: true, startTime: true, endTime: true, driverDuty: { select: { originStation: true } } },
          orderBy: { startTime: 'asc' },
        })
      : Promise.resolve([]),
  ]);

  // A driver with two lines that day is listed at their first.
  const shiftByWorker = new Map<string, DirectoryEntry['shift']>();
  for (const s of shifts) {
    if (!shiftByWorker.has(s.workerId)) {
      shiftByWorker.set(s.workerId, {
        startTime: s.startTime,
        endTime: s.endTime,
        originStation: s.driverDuty?.originStation ?? null,
      });
    }
  }

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

  return { day, entries };
}
