/**
 * Who hands a train to whom, and where, worked out from the drivers' tasks -
 * the drivers' counterpart of the פקחים handoffs (see docs/modules/drivers.md).
 *
 * A task is stored as read on the page, right to left (`DriverDuty.task`),
 * which is how it displays. In time order it runs the other way: the report
 * prints each line left to right - "בדק - 2504 - 503 - לוד - 23" is a check,
 * empty move 2504, train 503 into לוד, then train 23. Lines follow top to
 * bottom. So: reverse each line, keep the lines in order.
 *
 * In the stored text, steps on a line are joined by " - " and lines by a bare
 * space. The one other bare space is a passenger marker, "233 בת": riding
 * train 233, not driving it.
 */

export type Step = { kind: 'train'; number: string; passenger: boolean } | { kind: 'place'; name: string };

const PASSENGER = 'בת';
const TRAIN = /^\(?(\d{1,5})\)?$/;

/** Words in a task that name an activity, not a station a train can change hands at. */
const NOT_A_STATION = new Set(['מונית', 'בדק', 'עיתוק', 'כונן', 'כוננות', 'כיבוי', 'רציף', '??', 'מזרח', 'צפון', 'אמצע']);

/** A stored task as steps in time order. */
export function taskSteps(task: string): Step[] {
  const lines: string[][] = [[]];
  const words = task.split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word === '-') continue;
    const line = lines[lines.length - 1];
    const joined = i > 0 && words[i - 1] !== '-';
    if (joined && word === PASSENGER && line.length > 0) {
      line[line.length - 1] = `${line[line.length - 1]} ${PASSENGER}`;
    } else if (joined && line.length > 0) {
      lines.push([word]);
    } else {
      line.push(word);
    }
  }

  const steps: Step[] = [];
  for (const line of lines) {
    for (const unit of [...line].reverse()) {
      const [head, marker] = unit.split(' ');
      const train = head.match(TRAIN);
      const step: Step = train
        ? { kind: 'train', number: train[1], passenger: marker === PASSENGER }
        : { kind: 'place', name: unit };
      // "(511" next to "511" is the same train printed twice.
      const last = steps[steps.length - 1];
      if (step.kind === 'train' && last?.kind === 'train' && last.number === step.number) continue;
      steps.push(step);
    }
  }
  return steps;
}

/** The trains a driver actually drives, in order. */
export function drivenTrains(steps: Step[]): string[] {
  return steps.flatMap((s) => (s.kind === 'train' && !s.passenger ? [s.number] : []));
}

function stationAround(steps: Step[], trainNumber: string, direction: 1 | -1): string | null {
  const at = steps.findIndex((s) => s.kind === 'train' && !s.passenger && s.number === trainNumber);
  if (at < 0) return null;
  for (let i = at + direction; i >= 0 && i < steps.length; i += direction) {
    const step = steps[i];
    if (step.kind === 'train') return null;
    if (!NOT_A_STATION.has(step.name)) return step.name;
  }
  return null;
}

export interface DayDuty {
  shiftId: string;
  workerId: string;
  startTime: Date;
  originStation: string | null;
  task: string;
}

export interface Handoff {
  /** The other driver's shift. */
  shiftId: string;
  workerId: string;
  trainNumber: string;
  station: string | null;
}

export interface ShiftHandoffs {
  /** Drivers this shift takes a train over from - "אני מחליף את". */
  takesOverFrom: Handoff[];
  /** Drivers this shift hands a train to - "מחליף אותי". */
  handsOverTo: Handoff[];
}

/**
 * Every handoff of one roster day, by shift.
 *
 * For a train two drivers both drive, the one for whom it is the first train
 * of the day takes it over from the other. When that does not decide it (first
 * for both, or for neither), the driver who starts earlier hands over.
 *
 * Where: the first station after the train in the earlier driver's task (the
 * train ends there); failing that, the last station before it in the later
 * driver's task; failing that, the later driver's origin station.
 */
export function dayHandoffs(duties: DayDuty[]): Map<string, ShiftHandoffs> {
  const parsed = duties.map((d) => {
    const steps = taskSteps(d.task);
    return { duty: d, steps, driven: drivenTrains(steps) };
  });
  const result = new Map<string, ShiftHandoffs>(duties.map((d) => [d.shiftId, { takesOverFrom: [], handsOverTo: [] }]));

  const byTrain = new Map<string, typeof parsed>();
  for (const p of parsed) {
    for (const train of new Set(p.driven)) byTrain.set(train, [...(byTrain.get(train) ?? []), p]);
  }

  for (const [train, drivers] of byTrain) {
    if (drivers.length < 2) continue;
    for (let i = 0; i < drivers.length; i++) {
      for (let j = i + 1; j < drivers.length; j++) {
        const a = drivers[i];
        const b = drivers[j];
        if (a.duty.workerId === b.duty.workerId) continue;
        const aFirst = a.driven[0] === train;
        const bFirst = b.driven[0] === train;
        const bTakesOver = aFirst !== bFirst ? bFirst : b.duty.startTime > a.duty.startTime;
        const [from, to] = bTakesOver ? [a, b] : [b, a];

        const station =
          stationAround(from.steps, train, 1) ?? stationAround(to.steps, train, -1) ?? to.duty.originStation;
        result.get(to.duty.shiftId)!.takesOverFrom.push({ shiftId: from.duty.shiftId, workerId: from.duty.workerId, trainNumber: train, station });
        result.get(from.duty.shiftId)!.handsOverTo.push({ shiftId: to.duty.shiftId, workerId: to.duty.workerId, trainNumber: train, station });
      }
    }
  }
  return result;
}
