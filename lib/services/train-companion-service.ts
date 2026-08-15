import { prisma } from '../db/prisma';
import { alightStation, boardStation, rideDirection, type RideDirection } from '../roster/companions';
import { formatWorkerName } from '../utils/display-name';
import { stationNameHe } from './worker-shift-service';

/**
 * "Who is on my train right now?"
 *
 * An inspector works train 6716 from Ashkelon to Tel Aviv ההגנה. Somewhere else
 * in the same day's file, another inspector's shift string opens with `6716bt` -
 * they are sitting in that train as a passenger on their way to start their own
 * shift at ההגנה. Today the only way to know that is to read all 255 lines and
 * decode every shift string by hand, so nobody does.
 *
 * The parsed roster answers it directly: my working TRAIN legs, matched against
 * everyone else's TRANSIT legs on the same date. DutyLeg.trainNumber is indexed,
 * so this is one lookup per shift rather than a scan.
 */

export interface TrainCompanion {
  dutyId: string;
  serial: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  direction: RideDirection;
  /** Where they board, when the roster says so. */
  boardStationHe: string | null;
  /** Where they get off - their own duty's start, for a ride in. */
  alightStationHe: string | null;
  /** Their own shift's start/end, minutes past midnight. */
  startMinutes: number | null;
  endMinutes: number | null;
}

export interface TrainWithCompanions {
  trainNumber: string;
  /** Where I take this train from / to, as far as my own duty states it. */
  fromStationHe: string | null;
  toStationHe: string | null;
  companions: TrainCompanion[];
}

/**
 * Every inspector riding one of the trains this duty works, grouped by train.
 *
 * Trains with nobody aboard are still returned: "nobody is riding 6716" is a
 * real answer to the question, and dropping the row would make the picker look
 * broken. Ordered by my own leg sequence - the order I actually work them.
 */
export async function getTrainCompanions(dutyId: string): Promise<TrainWithCompanions[]> {
  const duty = await prisma.duty.findUnique({
    where: { id: dutyId },
    select: {
      tenantId: true,
      date: true,
      legs: {
        where: { kind: 'TRAIN', isDuty: true },
        orderBy: { seq: 'asc' },
        select: { seq: true, trainNumber: true, fromStation: true, toStation: true },
      },
    },
  });

  if (!duty) return [];

  const myLegs = duty.legs.filter((l): l is typeof l & { trainNumber: string } => Boolean(l.trainNumber));
  if (myLegs.length === 0) return [];

  // One indexed lookup for every train at once. Same tenant, same date, and not
  // my own duty - a duty can legitimately ride a train it also works later.
  const rides = await prisma.dutyLeg.findMany({
    where: {
      kind: 'TRANSIT',
      trainNumber: { in: myLegs.map((l) => l.trainNumber) },
      duty: { tenantId: duty.tenantId, date: duty.date, id: { not: dutyId } },
    },
    select: {
      seq: true,
      kind: true,
      isDuty: true,
      trainNumber: true,
      fromStation: true,
      fromSource: true,
      toStation: true,
      toSource: true,
      duty: {
        select: {
          id: true,
          serial: true,
          workerName: true,
          startStation: true,
          startSource: true,
          startMinutes: true,
          endMinutes: true,
          legs: {
            orderBy: { seq: 'asc' },
            select: { seq: true, kind: true, isDuty: true, trainNumber: true, fromStation: true, toStation: true },
          },
          shift: {
            select: { worker: { select: { firstName: true, lastName: true, phone: true, city: true } } },
          },
        },
      },
    },
  });

  const byTrain = new Map<string, TrainCompanion[]>();

  for (const ride of rides) {
    if (!ride.trainNumber) continue;

    const other = ride.duty;
    const direction = rideDirection(other.legs, ride.seq);
    const worker = other.shift?.worker ?? null;

    const companion: TrainCompanion = {
      dutyId: other.id,
      serial: other.serial,
      // The roster line names the inspector even when they have no account yet.
      name: worker ? formatWorkerName(worker) : (other.workerName ?? null),
      phone: worker?.phone ?? null,
      city: worker?.city ?? null,
      direction,
      boardStationHe: stationNameHe(boardStation(ride)),
      alightStationHe: stationNameHe(
        alightStation(ride, direction, { station: other.startStation, source: other.startSource }),
      ),
      startMinutes: other.startMinutes,
      endMinutes: other.endMinutes,
    };

    const bucket = byTrain.get(ride.trainNumber);
    if (bucket) bucket.push(companion);
    else byTrain.set(ride.trainNumber, [companion]);
  }

  return myLegs.map((leg) => ({
    trainNumber: leg.trainNumber,
    fromStationHe: stationNameHe(leg.fromStation),
    toStationHe: stationNameHe(leg.toStation),
    // Riders heading in first: they are the ones with somewhere to be.
    companions: (byTrain.get(leg.trainNumber) ?? []).sort((a, b) => {
      const rank = (d: RideDirection) => (d === 'TO_SHIFT' ? 0 : d === 'MID_SHIFT' ? 1 : 2);
      return rank(a.direction) - rank(b.direction) || (a.startMinutes ?? 0) - (b.startMinutes ?? 0);
    }),
  }));
}
