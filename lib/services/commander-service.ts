import { prisma } from '../db/prisma';
import type { PositionLeg } from '../roster/position';
import { formatWorkerName } from '../utils/display-name';
import { israelDateKey, israelMinutesOfDay, startOfIsraelDay } from '../time/zone';

/**
 * One roster day, in the shape the commander board needs to place everybody.
 *
 * The whole day is sent to the client at once, deliberately. The board's time
 * slider is its point - an admin drags to 06:00 to see the morning changeover -
 * and re-querying the server on every drag would make that useless. The position
 * maths is pure (lib/roster/position.ts), so the browser can recompute all ~255
 * duties per frame from data it already holds.
 *
 * What is sent is trimmed to what the board draws: no shift strings, no remarks,
 * no parse warnings. This is roster data about named people, so it is served
 * only to the roles that already see the whole roster.
 */

export interface CommanderDuty {
  dutyId: string;
  serial: string;
  section: string;
  /** Roster name, falling back to the account when one exists. */
  name: string | null;
  phone: string | null;
  city: string | null;
  startMinutes: number | null;
  endMinutes: number | null;
  legs: PositionLeg[];
  /** Who takes this duty's train on, from the handoff engine. */
  handsOverTo: { name: string | null; serial: string; trainNumber: string; atMinutes: number } | null;
}

export interface CommanderSnapshot {
  /** yyyy-mm-dd of the roster day being shown. */
  date: string;
  /** Minutes past midnight "now" is, when the requested day IS today. */
  nowMinutes: number | null;
  duties: CommanderDuty[];
}

export async function getCommanderSnapshot(tenantId: string, date: Date): Promise<CommanderSnapshot> {
  const day = startOfIsraelDay(date);
  const now = new Date();

  const duties = await prisma.duty.findMany({
    where: { tenantId, date: day },
    orderBy: [{ section: 'asc' }, { startMinutes: 'asc' }],
    select: {
      id: true,
      serial: true,
      section: true,
      workerName: true,
      startMinutes: true,
      endMinutes: true,
      legs: {
        orderBy: { seq: 'asc' },
        select: {
          seq: true,
          kind: true,
          isDuty: true,
          trainNumber: true,
          fromStation: true,
          toStation: true,
        },
      },
      shift: { select: { worker: { select: { firstName: true, lastName: true, phone: true, city: true } } } },
      handoffsAsPredecessor: {
        orderBy: { confidence: 'desc' },
        take: 1,
        select: {
          trainNumber: true,
          successorStartMinutes: true,
          successorDuty: {
            select: {
              serial: true,
              workerName: true,
              shift: { select: { worker: { select: { firstName: true, lastName: true } } } },
            },
          },
        },
      },
    },
  });

  return {
    date: israelDateKey(day),
    // Only meaningful for today: scrubbing to a past date has no "now" on it.
    nowMinutes: israelDateKey(now) === israelDateKey(day) ? israelMinutesOfDay(now) : null,
    duties: duties.map((duty) => {
      const worker = duty.shift?.worker ?? null;
      const handoff = duty.handoffsAsPredecessor[0] ?? null;
      const successorWorker = handoff?.successorDuty.shift?.worker ?? null;

      return {
        dutyId: duty.id,
        serial: duty.serial,
        section: duty.section,
        name: worker ? formatWorkerName(worker) : (duty.workerName ?? null),
        phone: worker?.phone ?? null,
        city: worker?.city ?? null,
        startMinutes: duty.startMinutes,
        endMinutes: duty.endMinutes,
        legs: duty.legs.map((l) => ({ ...l, kind: String(l.kind) })),
        handsOverTo: handoff
          ? {
              name: successorWorker
                ? formatWorkerName(successorWorker)
                : (handoff.successorDuty.workerName ?? null),
              serial: handoff.successorDuty.serial,
              trainNumber: handoff.trainNumber,
              atMinutes: handoff.successorStartMinutes,
            }
          : null,
      };
    }),
  };
}
