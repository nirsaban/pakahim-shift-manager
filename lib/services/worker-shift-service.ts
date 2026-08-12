import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { resolveStation } from '../reference/stations';
import { TRAIN_LINES } from '../reference/lines';
import { formatWorkerName } from '../utils/display-name';

/**
 * Everything one inspector needs about their own shifts — and nothing about
 * anyone else's.
 *
 * A worker's dashboard used to list every member of their team. That is the
 * scheduler's view, not theirs: it is noise on a phone, and it exposes the whole
 * roster to someone who only needs to know when they start, where, and who they
 * take the train from. This returns just their previous / current / next shift,
 * with the parsed duty behind each one.
 */

const DUTY_INCLUDE = {
  legs: { orderBy: { seq: 'asc' } },
} as const;

const SHIFT_INCLUDE = {
  replacement: true,
  duty: { include: DUTY_INCLUDE },
} as const;

export interface ShiftPersonRef {
  name: string;
  phone: string | null;
  city: string | null;
}

export interface HandoffPartner {
  /** The train being handed over. */
  trainNumber: string;
  station: string | null;
  stationNameHe: string | null;
  atMinutes: number;
  gapMinutes: number;
  person: ShiftPersonRef | null;
  serial: string;
}

/** A shift with its replacement and the parsed duty (and its legs) behind it. */
export type WorkerShift = Prisma.ShiftGetPayload<{ include: typeof SHIFT_INCLUDE }>;

export function stationNameHe(code: string | null): string | null {
  if (!code) return null;
  return resolveStation(code)?.nameHe ?? code;
}

export function lineNameHe(code: string | null): string | null {
  if (!code) return null;
  return TRAIN_LINES.find((l) => l.code === code)?.nameHe ?? null;
}

/**
 * The three shifts that matter right now: the one just finished, the one running,
 * and the one coming up.
 *
 * `current` is a shift whose window contains now. When there is no current
 * shift, `next` is the primary card; when there is one, `next` is what follows
 * it. SICK/HOLIDAY shifts are included because the worker still needs to see
 * that a replacement was actually assigned.
 */
export async function getWorkerShiftWindow(workerId: string): Promise<{
  previous: WorkerShift | null;
  current: WorkerShift | null;
  next: WorkerShift | null;
}> {
  const now = new Date();
  // SICK/HOLIDAY are included: the worker is not working the shift, but they
  // still need to see that a replacement was actually assigned.
  const visible: Prisma.EnumShiftStatusFilter = {
    in: ['SCHEDULED', 'STARTED', 'COMPLETED', 'SICK', 'HOLIDAY'],
  };

  const [current, next, previous] = await Promise.all([
    prisma.shift.findFirst({
      where: { workerId, startTime: { lte: now }, endTime: { gte: now }, status: visible },
      orderBy: { startTime: 'asc' },
      include: SHIFT_INCLUDE,
    }),
    prisma.shift.findFirst({
      where: { workerId, startTime: { gt: now }, status: visible },
      orderBy: { startTime: 'asc' },
      include: SHIFT_INCLUDE,
    }),
    prisma.shift.findFirst({
      where: { workerId, endTime: { lt: now }, status: visible },
      orderBy: { endTime: 'desc' },
      include: SHIFT_INCLUDE,
    }),
  ]);

  return { previous, current, next };
}

/**
 * The two people either side of this duty in the train's chain: who the
 * inspector relieves, and who relieves them.
 *
 * This is the question the roster file cannot answer without reading every other
 * line by hand — the reason the handoff engine exists.
 */
export async function getHandoffPartners(dutyId: string): Promise<{
  takesOverFrom: HandoffPartner | null;
  handsOverTo: HandoffPartner | null;
}> {
  const partnerDuty = {
    select: {
      serial: true,
      workerName: true,
      shift: { select: { worker: { select: { firstName: true, lastName: true, phone: true, city: true } } } },
    },
  } as const;

  const [incoming, outgoing] = await Promise.all([
    // This duty is the successor — someone hands the train to them.
    prisma.handoff.findFirst({
      where: { successorDutyId: dutyId },
      orderBy: { confidence: 'desc' },
      include: { predecessorDuty: partnerDuty },
    }),
    // This duty is the predecessor — they hand the train on.
    prisma.handoff.findFirst({
      where: { predecessorDutyId: dutyId },
      orderBy: { confidence: 'desc' },
      include: { successorDuty: partnerDuty },
    }),
  ]);

  const toPerson = (
    duty: { workerName: string | null; shift: { worker: { firstName: string | null; lastName: string | null; phone: string | null; city: string | null } } | null } | null,
  ): ShiftPersonRef | null => {
    if (!duty) return null;
    const worker = duty.shift?.worker;
    // The roster line carries a name even when nobody has an account yet.
    const name = worker ? formatWorkerName(worker) : (duty.workerName ?? '');
    if (!name) return null;
    return { name, phone: worker?.phone ?? null, city: worker?.city ?? null };
  };

  return {
    takesOverFrom: incoming
      ? {
          trainNumber: incoming.trainNumber,
          station: incoming.station,
          stationNameHe: stationNameHe(incoming.station),
          atMinutes: incoming.predecessorEndMinutes,
          gapMinutes: incoming.gapMinutes,
          person: toPerson(incoming.predecessorDuty),
          serial: incoming.predecessorDuty.serial,
        }
      : null,
    handsOverTo: outgoing
      ? {
          trainNumber: outgoing.trainNumber,
          station: outgoing.station,
          stationNameHe: stationNameHe(outgoing.station),
          atMinutes: outgoing.successorStartMinutes,
          gapMinutes: outgoing.gapMinutes,
          person: toPerson(outgoing.successorDuty),
          serial: outgoing.successorDuty.serial,
        }
      : null,
  };
}
