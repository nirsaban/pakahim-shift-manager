import { describe, expect, it } from 'vitest';
import { parseDuty } from './duty';
import { detectHandoffs } from './handoff';
import { parseRouteNote } from './route-note';
import type { RosterRowInput } from './types';

function row(partial: Partial<RosterRowInput> & { shiftString: string }): RosterRowInput {
  return {
    rowIndex: 0,
    blockIndex: 0,
    section: 'פקחים דרום',
    sectionDate: null,
    serial: '1',
    name: 'בדיקה',
    workerNumber: '100000',
    mirs: '',
    traineeName: '',
    startMinutes: 6 * 60,
    endMinutes: 12 * 60,
    routeNote: '',
    remarks: '',
    ...partial,
  };
}

describe('route notes', () => {
  it('reads the combined form', () => {
    const n = parseRouteNote('איסוף ופיזור מ/אל מתחם אשקלון');
    expect(n).toMatchObject({ pickupStation: 'ashkelon', dispersalStation: 'ashkelon' });
  });

  it('reads a split pickup and dispersal', () => {
    const n = parseRouteNote('איסוף לת"א סבידור מרכז ופיזור מת"א ההגנה');
    expect(n).toMatchObject({ pickupStation: 'savidor', dispersalStation: 'hagana' });
  });

  it('reads a dispersal on its own', () => {
    expect(parseRouteNote('פיזור מראש העין צפון')).toMatchObject({
      pickupStation: null,
      dispersalStation: 'rosh_haayin_tzafon',
    });
  });

  it('strips the מתחם / אוטם qualifiers', () => {
    expect(parseRouteNote('איסוף לאוטם ת"א סבידור מרכז')).toMatchObject({ pickupStation: 'savidor' });
    expect(parseRouteNote('איסוף לבאר שבע צפון מתחם')).toMatchObject({
      pickupStation: 'beer_sheva_universita',
    });
  });

  it('returns null for an empty note', () => {
    expect(parseRouteNote('')).toBeNull();
  });
});

describe('duty endpoints', () => {
  it('applies the Lod convention when nothing else says otherwise', () => {
    const d = parseDuty(row({ shiftString: '2501-502-505-510' }));
    expect(d.startStation).toBe('lod');
    expect(d.startSource).toBe('DEFAULT_LOD');
    expect(d.endStation).toBe('lod');
    expect(d.firstActiveTrain).toBe('2501');
    expect(d.lastActiveTrain).toBe('510');
  });

  it('lets the route note beat the Lod convention', () => {
    const d = parseDuty(
      row({ shiftString: '2501-502-505-510', routeNote: 'איסוף לאשקלון ופיזור מרחובות' }),
    );
    expect(d.startStation).toBe('ashkelon');
    expect(d.startSource).toBe('ROUTE_NOTE');
    expect(d.endStation).toBe('rehovot');
  });

  it('ends the duty at the last ACTIVE leg, not at the ride home', () => {
    const d = parseDuty(row({ shiftString: '2107-152-109-hagana-409bt' }));
    expect(d.lastActiveTrain).toBe('109');
    expect(d.endStation).toBe('hagana'); // duty ended here
    expect(d.finalStation).toBe('lod'); // 409bt carried them on to Lod
  });

  it('records an interior transfer as a known unknown rather than inventing Lod', () => {
    const d = parseDuty(row({ shiftString: '2501-502-505-510' }));
    const interior = d.legs.slice(0, -1);
    expect(interior.every((l) => l.toStation === null && l.toSource === 'INFERRED_TRANSFER')).toBe(true);
  });

  it('resolves the line for a train and flags a stripped service move', () => {
    const d = parseDuty(row({ shiftString: '2101-100' }));
    expect(d.legs[0]).toMatchObject({ lineCode: 'nahariya_modiin', isServiceMove: true });
    expect(d.legs[1]).toMatchObject({ lineCode: 'nahariya_modiin', isServiceMove: false });
  });

  // An איסוף/פיזור note means a taxi carries the inspector door-to-door at the
  // railway's expense; a bt leg means they ride a service train on their own
  // time. The roster uses one or the other, never both at the same end.
  it('reads an איסוף/פיזור note as a taxi at both ends', () => {
    const d = parseDuty(
      row({
        shiftString: '324-333-340-2637',
        routeNote: 'איסוף לראשל"צ משה דיין ופיזור מאשקלון',
      }),
    );
    expect(d.startTransport).toBe('TAXI');
    expect(d.endTransport).toBe('TAXI');
    expect(d.startStation).toBe('dayan');
    expect(d.endStation).toBe('ashkelon');
    // no bt anywhere — the taxi replaces it
    expect(d.legs.some((l) => l.kind === 'TRANSIT')).toBe(false);
  });

  it('reads a bt leg as the inspector travelling by rail', () => {
    const d = parseDuty(row({ shiftString: '242bt-hagana-162-119-174-hagana-41bt' }));
    expect(d.startTransport).toBe('RAIL');
    expect(d.endTransport).toBe('RAIL');
  });

  it('reports neither when the roster says nothing', () => {
    const d = parseDuty(row({ shiftString: '2501-502-505-510' }));
    expect(d.startTransport).toBe('NONE');
    expect(d.endTransport).toBe('NONE');
  });

  it('lets a taxi note win over a bt leg at the same end', () => {
    // 4 of 94 rows do state both; the note is the scheduler's explicit word.
    const d = parseDuty(
      row({ shiftString: '300-hertzliya-307-316-hertzliya-409bt', routeNote: 'פיזור מהרצליה' }),
    );
    expect(d.endTransport).toBe('TAXI');
  });

  it('marks משני serials as reinforcement', () => {
    expect(parseDuty(row({ serial: 'משני17', shiftString: '101' })).isReinforcement).toBe(true);
    expect(parseDuty(row({ serial: '17', shiftString: '101' })).isReinforcement).toBe(false);
  });
});

describe('handoff detection', () => {
  const base = { section: 'פקחים דרום', routeNote: '', remarks: '', mirs: '', traineeName: '', workerNumber: '1', name: 'x' };

  it('matches on last-active to first-active within the window', () => {
    const pred = parseDuty(row({ ...base, rowIndex: 1, serial: '21', shiftString: '2501-502-505-510', startMinutes: 275, endMinutes: 615 }));
    const succ = parseDuty(row({ ...base, rowIndex: 2, serial: '74', shiftString: '510-otem-(510-513)-513-518', startMinutes: 600, endMinutes: 1095 }));
    const h = detectHandoffs([pred, succ]);
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ trainNumber: '510', gapMinutes: 15 });
  });

  it('does not treat a passenger riding the same train as the replacer', () => {
    const pred = parseDuty(row({ ...base, rowIndex: 1, serial: '21', shiftString: '2501-502-505-510', startMinutes: 275, endMinutes: 615 }));
    // starts by RIDING 510 as a passenger, then works 634
    const rider = parseDuty(row({ ...base, rowIndex: 3, serial: '75', shiftString: '510bt-hagana-634-641', startMinutes: 600, endMinutes: 919 }));
    expect(detectHandoffs([pred, rider])).toHaveLength(0);
  });

  it('keeps reinforcement duties in their own matching block', () => {
    const pred = parseDuty(row({ ...base, rowIndex: 1, serial: '12', shiftString: '714-721-733', startMinutes: 255, endMinutes: 524 }));
    const predM = parseDuty(row({ ...base, rowIndex: 2, serial: 'משני17', shiftString: '716-723-733', startMinutes: 335, endMinutes: 524 }));
    const succ = parseDuty(row({ ...base, rowIndex: 3, serial: '72', shiftString: '733-738-745', startMinutes: 590, endMinutes: 1025 }));

    const h = detectHandoffs([pred, predM, succ]);
    // the primary hands over; the משני double-crew line does not compete for it
    expect(h).toHaveLength(1);
    expect(h[0].predecessor.serial).toBe('12');
  });

  it('respects the window and wraps around midnight', () => {
    const pred = parseDuty(row({ ...base, rowIndex: 1, serial: 'a', shiftString: '101-102', startMinutes: 1200, endMinutes: 1430 })); // 23:50
    const succ = parseDuty(row({ ...base, rowIndex: 2, serial: 'b', shiftString: '102-103', startMinutes: 30, endMinutes: 300 })); // 00:30
    expect(detectHandoffs([pred, succ])[0]?.gapMinutes).toBe(40);
    expect(detectHandoffs([pred, succ], { windowMinutes: 20 })).toHaveLength(0);
  });

  it('flags the both-sides dead-head crossing', () => {
    const pred = parseDuty(row({ ...base, rowIndex: 1, serial: '45', shiftString: '2811-622-hertzliya-629-hagana-27bt', startMinutes: 305, endMinutes: 640 }));
    const succ = parseDuty(row({ ...base, rowIndex: 2, serial: '68', shiftString: '238bt-hagana-629-ashkelon-640', startMinutes: 560, endMinutes: 915 }));
    const h = detectHandoffs([pred, succ]);
    expect(h[0]).toMatchObject({
      bothSidesDeadhead: true,
      station: 'hagana',
      predecessorExitTrain: '27',
      successorEntryTrain: '238',
    });
  });
});
