import { describe, expect, it } from 'vitest';
import {
  dutyDurationMinutes,
  elapsedAt,
  estimatePosition,
  isRunningAt,
  type PositionDuty,
  type PositionLeg,
} from './position';

function leg(seq: number, kind: string, over: Partial<PositionLeg> = {}): PositionLeg {
  return {
    seq,
    kind,
    isDuty: kind === 'TRAIN',
    trainNumber: null,
    fromStation: null,
    toStation: null,
    ...over,
  };
}

/** 06:00-12:00: ride in from Lod, work two trains, ride home. */
const duty: PositionDuty = {
  startMinutes: 6 * 60,
  endMinutes: 12 * 60,
  legs: [
    leg(0, 'TRANSIT', { isDuty: false, trainNumber: '238', fromStation: 'lod', toStation: 'hagana' }),
    leg(1, 'TRAIN', { trainNumber: '629', fromStation: 'hagana', toStation: 'ashkelon' }),
    leg(2, 'TRAIN', { trainNumber: '647', fromStation: 'ashkelon', toStation: 'lod' }),
    leg(3, 'OPS', { isDuty: false }),
  ],
};

describe('dutyDurationMinutes', () => {
  it('measures a same-day duty', () => {
    expect(dutyDurationMinutes(duty)).toBe(6 * 60);
  });

  it('measures a duty that runs past midnight', () => {
    // The מוצ"ש shape: 20:30 to 02:40.
    expect(dutyDurationMinutes({ startMinutes: 1230, endMinutes: 160, legs: [] })).toBe(370);
  });

  it('is null when the roster left a time blank', () => {
    expect(dutyDurationMinutes({ startMinutes: null, endMinutes: 600, legs: [] })).toBeNull();
  });
});

describe('isRunningAt / elapsedAt', () => {
  it('places a clock minute inside the duty', () => {
    expect(isRunningAt(duty, 9 * 60)).toBe(true);
    expect(elapsedAt(duty, 9 * 60)).toBe(3 * 60);
  });

  it('excludes minutes before and after', () => {
    expect(isRunningAt(duty, 5 * 60)).toBe(false);
    expect(isRunningAt(duty, 13 * 60)).toBe(false);
  });

  it('reads 01:00 as inside a duty that began at 20:30 the evening before', () => {
    const night: PositionDuty = { startMinutes: 1230, endMinutes: 160, legs: [] };
    expect(isRunningAt(night, 60)).toBe(true);
    expect(elapsedAt(night, 60)).toBe(270);
  });
});

describe('estimatePosition', () => {
  it('has them riding in as passengers at the start', () => {
    const at = estimatePosition(duty, 6 * 60 + 5);
    expect(at).toMatchObject({ kind: 'DEADHEAD', trainNumber: '238', legSeq: 0 });
  });

  it('has them working a train in the middle', () => {
    const at = estimatePosition(duty, 9 * 60);
    expect(at?.kind).toBe('DUTY');
    expect(['629', '647']).toContain(at?.trainNumber);
  });

  it('reports progress through the leg, not through the shift', () => {
    const at = estimatePosition(duty, 6 * 60 + 1);
    expect(at?.progress).toBeGreaterThanOrEqual(0);
    expect(at?.progress).toBeLessThan(0.5);
  });

  it('marks a leg between two known stations as distance-backed', () => {
    expect(estimatePosition(duty, 6 * 60 + 5)?.confidence).toBe('STATED');
  });

  it('admits when a leg had no endpoints to measure', () => {
    const vague: PositionDuty = {
      startMinutes: 600,
      endMinutes: 720,
      legs: [leg(0, 'TRAIN', { trainNumber: '500' })],
    };
    expect(estimatePosition(vague, 660)?.confidence).toBe('ESTIMATED');
  });

  it('returns nothing at all when the duty is not running', () => {
    // The board must leave them off rather than draw them somewhere arbitrary.
    expect(estimatePosition(duty, 3 * 60)).toBeNull();
  });

  it('never runs off the end of a duty whose legs weigh less than its hours', () => {
    // Weights are notional; the duty's own end time is the fact. The last leg
    // absorbs whatever is left rather than the walk falling through.
    const at = estimatePosition(duty, 12 * 60);
    expect(at).not.toBeNull();
    expect(at?.legSeq).toBe(3);
  });

  it('handles a duty with no parsed legs without crashing the board', () => {
    const bare: PositionDuty = { startMinutes: 600, endMinutes: 720, legs: [] };
    expect(estimatePosition(bare, 660)).toMatchObject({ kind: 'IDLE', legSeq: null });
  });
});
