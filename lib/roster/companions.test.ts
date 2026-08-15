import { describe, expect, it } from 'vitest';
import { alightStation, boardStation, rideDirection, type CompanionLeg } from './companions';

/** Legs of "238bt-hagana-629-647-519bt": ride in, work two trains, ride home. */
const legs: CompanionLeg[] = [
  { seq: 0, kind: 'TRANSIT', isDuty: false, trainNumber: '238', fromStation: 'lod', toStation: null },
  { seq: 1, kind: 'STATION', isDuty: false, trainNumber: null, fromStation: null, toStation: 'hagana' },
  { seq: 2, kind: 'TRAIN', isDuty: true, trainNumber: '629', fromStation: 'hagana', toStation: null },
  { seq: 3, kind: 'TRAIN', isDuty: true, trainNumber: '647', fromStation: null, toStation: 'lod' },
  { seq: 4, kind: 'TRANSIT', isDuty: false, trainNumber: '519', fromStation: 'lod', toStation: null },
];

describe('rideDirection', () => {
  it('reads a leading passenger leg as the ride to the shift', () => {
    expect(rideDirection(legs, 0)).toBe('TO_SHIFT');
  });

  it('reads a trailing passenger leg as the ride home', () => {
    expect(rideDirection(legs, 4)).toBe('FROM_SHIFT');
  });

  it('reads a passenger leg between two worked trains as repositioning', () => {
    const mid: CompanionLeg[] = [
      ...legs.slice(0, 3),
      { seq: 3, kind: 'TRANSIT', isDuty: false, trainNumber: '900', fromStation: null, toStation: null },
      { seq: 4, kind: 'TRAIN', isDuty: true, trainNumber: '647', fromStation: null, toStation: 'lod' },
    ];
    expect(rideDirection(mid, 3)).toBe('MID_SHIFT');
  });

  it('treats a duty with no working leg at all as travelling in', () => {
    // Open duties and pure-standby lines exist; they must not crash the lookup.
    expect(rideDirection([legs[0]], 0)).toBe('TO_SHIFT');
  });
});

describe('alightStation', () => {
  it('prefers what the leg itself states', () => {
    const stated = { ...legs[0], toStation: 'savidor', toSource: 'EXPLICIT_TOKEN' };
    expect(alightStation(stated, 'TO_SHIFT', { station: 'hagana' })).toBe('savidor');
  });

  it('falls back to where the duty starts when the ride in leaves it unstated', () => {
    expect(
      alightStation(legs[0], 'TO_SHIFT', { station: 'hagana', source: 'EXPLICIT_TOKEN' }),
    ).toBe('hagana');
  });

  it('does not guess for a ride home', () => {
    // Their own home station is not in the roster, so anything here is invention.
    expect(alightStation(legs[4], 'FROM_SHIFT', { station: 'hagana' })).toBeNull();
  });

  it('refuses the Lod convention as an answer', () => {
    // Measured on the real 14.08 file: without this, two riders whose boarding
    // station the roster never states were both shown as boarding at Lod.
    expect(alightStation(legs[0], 'TO_SHIFT', { station: 'lod', source: 'DEFAULT_LOD' })).toBeNull();
  });
});

describe('boardStation', () => {
  it('reports a station the roster actually named', () => {
    expect(boardStation({ ...legs[0], fromSource: 'EXPLICIT_TOKEN' })).toBe('lod');
  });

  it('says nothing when the station is only the Lod default or an inferred transfer', () => {
    expect(boardStation({ ...legs[0], fromSource: 'DEFAULT_LOD' })).toBeNull();
    expect(boardStation({ ...legs[0], fromSource: 'INFERRED_TRANSFER' })).toBeNull();
  });
});
