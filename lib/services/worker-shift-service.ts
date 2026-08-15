import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { stationNameHe } from '../reference/station-names';
import { addIsraelDays, israelDateKey, startOfIsraelDay } from '../time/zone';
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

/** Who hands this duty its train, and who takes it on. */
export interface HandoffPair {
  takesOverFrom: HandoffPartner | null;
  handsOverTo: HandoffPartner | null;
}

const NO_HANDOFFS: HandoffPair = { takesOverFrom: null, handsOverTo: null };

// Re-exported so the many server callers keep their import, while the browser
// (the commander board) can pull the same lookup without dragging prisma in.
export { stationNameHe };

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

/** The parsed duty behind a shift, in the shape the detail view renders. */
export type ScheduleDuty = Prisma.DutyGetPayload<{ include: typeof DUTY_INCLUDE }>;

/** One entry in a worker's own schedule list. */
export interface ScheduleEntry {
  shiftId: string;
  /** yyyy-mm-dd in local time, so the client never re-derives the date from a UTC stamp. */
  date: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  status: string;
  region: string | null;
  serial: string | null;
  routeNote: string | null;
  startStationHe: string | null;
  endStationHe: string | null;
  /** Set when someone else is covering this shift for them. */
  replacementName: string | null;
  /**
   * The full parsed duty, so any shift in the list can be opened out to the same
   * detail the current one gets. The worker asked for the roster they already
   * have on paper, not a summary of it - and a shift they worked yesterday is
   * exactly what they need when a question comes up about it afterwards.
   */
  duty: ScheduleDuty | null;
  handoffs: HandoffPair;
}

// The day a shift belongs to is the day it starts in ISRAEL - a duty starting
// 00:30 belongs to that date, not to the previous one a UTC reading would give.
const localDateKey = israelDateKey;

/**
 * Every shift a worker has in a window, not just the next one.
 *
 * The three-shift window above answers "what am I doing now"; this answers "what
 * does my week look like" — the question that only became askable once an upload
 * could carry several days at once. Ordered ascending because the list is read
 * forwards, and capped so a mis-parsed roster cannot return a year of rows.
 */
export async function getWorkerSchedule(
  workerId: string,
  options: { from?: Date; to?: Date; limit?: number } = {},
): Promise<ScheduleEntry[]> {
  const from = options.from ?? startOfIsraelDay(new Date());
  const to = options.to ?? addIsraelDays(from, 21);

  const shifts = await prisma.shift.findMany({
    where: {
      workerId,
      startTime: { gte: from, lte: to },
      status: { in: ['SCHEDULED', 'STARTED', 'COMPLETED', 'SICK', 'HOLIDAY'] },
    },
    orderBy: { startTime: 'asc' },
    take: options.limit ?? 100,
    include: {
      replacement: { select: { firstName: true, lastName: true } },
      duty: { include: DUTY_INCLUDE },
    },
  });

  // Two queries for the whole list rather than two per shift: a fortnight of
  // roster is ~14 duties, and per-entry lookups would be 28 round trips to
  // render one screen.
  const handoffs = await getHandoffPartnersForDuties(
    shifts.map((s) => s.duty?.id).filter((id): id is string => Boolean(id)),
  );

  return shifts.map((shift) => ({
    shiftId: shift.id,
    date: localDateKey(shift.startTime),
    startTime: shift.startTime,
    endTime: shift.endTime,
    durationMinutes: Math.max(0, Math.round((shift.endTime.getTime() - shift.startTime.getTime()) / 60_000)),
    status: shift.status,
    region: shift.region,
    serial: shift.duty?.serial ?? null,
    routeNote: shift.duty?.routeNote ?? null,
    startStationHe: stationNameHe(shift.duty?.startStation ?? null),
    endStationHe: stationNameHe(shift.duty?.endStation ?? null),
    replacementName: shift.replacement ? formatWorkerName(shift.replacement) : null,
    duty: shift.duty ?? null,
    handoffs: (shift.duty && handoffs.get(shift.duty.id)) ?? NO_HANDOFFS,
  }));
}

/**
 * The two people either side of this duty in the train's chain: who the
 * inspector relieves, and who relieves them.
 *
 * This is the question the roster file cannot answer without reading every other
 * line by hand — the reason the handoff engine exists.
 */
const PARTNER_DUTY = {
  select: {
    serial: true,
    workerName: true,
    shift: { select: { worker: { select: { firstName: true, lastName: true, phone: true, city: true } } } },
  },
} as const;

type PartnerDuty = {
  serial: string;
  workerName: string | null;
  shift: {
    worker: { firstName: string | null; lastName: string | null; phone: string | null; city: string | null };
  } | null;
};

function toPerson(duty: PartnerDuty): ShiftPersonRef | null {
  const worker = duty.shift?.worker;
  // The roster line carries a name even when nobody has an account yet.
  const name = worker ? formatWorkerName(worker) : (duty.workerName ?? '');
  if (!name) return null;
  return { name, phone: worker?.phone ?? null, city: worker?.city ?? null };
}

export async function getHandoffPartners(dutyId: string): Promise<HandoffPair> {
  return (await getHandoffPartnersForDuties([dutyId])).get(dutyId) ?? NO_HANDOFFS;
}

/**
 * The same two partners, for many duties at once.
 *
 * Rendering a fortnight of schedule with the full detail behind each shift would
 * otherwise be two queries per row. Ordered by confidence and taking the first
 * per duty keeps the single-duty tie-break: the roster can imply more than one
 * candidate, and the engine's own score decides.
 */
export async function getHandoffPartnersForDuties(dutyIds: string[]): Promise<Map<string, HandoffPair>> {
  const byDuty = new Map<string, HandoffPair>();
  if (dutyIds.length === 0) return byDuty;

  const [incoming, outgoing] = await Promise.all([
    // These duties are the successor — someone hands the train to them.
    prisma.handoff.findMany({
      where: { successorDutyId: { in: dutyIds } },
      orderBy: { confidence: 'desc' },
      include: { predecessorDuty: PARTNER_DUTY },
    }),
    // These duties are the predecessor — they hand the train on.
    prisma.handoff.findMany({
      where: { predecessorDutyId: { in: dutyIds } },
      orderBy: { confidence: 'desc' },
      include: { successorDuty: PARTNER_DUTY },
    }),
  ]);

  const entryFor = (dutyId: string): HandoffPair => {
    const existing = byDuty.get(dutyId);
    if (existing) return existing;
    const fresh: HandoffPair = { takesOverFrom: null, handsOverTo: null };
    byDuty.set(dutyId, fresh);
    return fresh;
  };

  for (const handoff of incoming) {
    const entry = entryFor(handoff.successorDutyId);
    if (entry.takesOverFrom) continue;
    entry.takesOverFrom = {
      trainNumber: handoff.trainNumber,
      station: handoff.station,
      stationNameHe: stationNameHe(handoff.station),
      atMinutes: handoff.predecessorEndMinutes,
      gapMinutes: handoff.gapMinutes,
      person: toPerson(handoff.predecessorDuty),
      serial: handoff.predecessorDuty.serial,
    };
  }

  for (const handoff of outgoing) {
    const entry = entryFor(handoff.predecessorDutyId);
    if (entry.handsOverTo) continue;
    entry.handsOverTo = {
      trainNumber: handoff.trainNumber,
      station: handoff.station,
      stationNameHe: stationNameHe(handoff.station),
      atMinutes: handoff.successorStartMinutes,
      gapMinutes: handoff.gapMinutes,
      person: toPerson(handoff.successorDuty),
      serial: handoff.successorDuty.serial,
    };
  }

  return byDuty;
}
