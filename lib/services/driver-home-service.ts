import { prisma } from '../db/prisma';
import { formatWorkerName } from '../utils/display-name';

/**
 * A driver's own upcoming shifts, for the home page. The browsing pages (a
 * day, a shift, a driver, a train, a station) read through
 * driver-views-service.
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
