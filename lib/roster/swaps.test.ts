import { describe, expect, it } from 'vitest';
import { estimateTravelMinutes, stopsBetween } from './travel';
import { dutyCost, dutyCostBreakdown, generateSwapSuggestions, type WorkerHome } from './swaps';
import { detectHandoffs } from './handoff';
import { parseDuty } from './duty';
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

describe('travel estimates', () => {
  it('counts stops along the shortest shared line', () => {
    // Most lines run savidor -> ta_hashalom -> hagana, but the 400-439 Carmiel
    // line skips ta_hashalom — the shortest path across all lines wins.
    expect(stopsBetween('savidor', 'hagana')).toBe(1);
    expect(stopsBetween('savidor', 'ta_hashalom')).toBe(1);
  });

  it('routes across lines through an interchange', () => {
    // navon is only on the Jerusalem lines; lod only on the coastal/south ones
    const stops = stopsBetween('navon', 'lod');
    expect(stops).not.toBeNull();
    expect(stops).toBeGreaterThan(2);
  });

  it('is symmetric and zero for the same station', () => {
    expect(estimateTravelMinutes('lod', 'lod')).toBe(0);
    expect(estimateTravelMinutes('lod', 'hagana')).toBe(estimateTravelMinutes('hagana', 'lod'));
  });

  it('returns null — never zero — when an endpoint is unknown', () => {
    expect(estimateTravelMinutes(null, 'lod')).toBeNull();
    expect(estimateTravelMinutes('lod', undefined)).toBeNull();
  });

  it('never routes through an uncertain line', () => {
    // hadera_mizrah only appears on the inferred 840-881 corridor
    expect(stopsBetween('hadera_mizrah', 'lod')).toBeNull();
  });
});

describe('duty cost', () => {
  it('is null when the home station is unknown', () => {
    const d = parseDuty(row({ shiftString: '2501-502-510' }));
    expect(dutyCost(d, null)).toBeNull();
  });

  it('prices the round trip from home', () => {
    const d = parseDuty(row({ shiftString: '2501-502-510' })); // starts and ends at Lod
    expect(dutyCost(d, 'lod')).toBe(0);
    expect(dutyCost(d, 'hagana')).toBeGreaterThan(0);
  });

  // A taxi end is transport the railway pays for door-to-door; a bt end is the
  // inspector's own unpaid travel. Scoring keeps them apart.
  it('books a taxi end against the railway, not the inspector', () => {
    const taxi = parseDuty(
      row({ shiftString: '324-333-340-2637', routeNote: 'איסוף לראשל"צ משה דיין ופיזור מאשקלון' }),
    );
    const cost = dutyCostBreakdown(taxi, 'navon');
    expect(cost!.railMinutes).toBe(0);
    expect(cost!.taxiMinutes).toBeGreaterThan(0);
  });

  it('books a bt end against the inspector', () => {
    const rail = parseDuty(row({ shiftString: '242bt-hagana-162-119-174-hagana-41bt' }));
    const cost = dutyCostBreakdown(rail, 'navon');
    expect(cost!.taxiMinutes).toBe(0);
    expect(cost!.railMinutes).toBeGreaterThan(0);
  });
});

describe('swap suggestions', () => {
  const homes = (entries: Array<[string, string | null]>): Map<string, WorkerHome> =>
    new Map(entries.map(([wn, home], i) => [wn, { workerId: `w${i}`, homeStation: home }]));

  function crossingPair() {
    const pred = parseDuty(
      row({
        rowIndex: 1,
        serial: '45',
        workerNumber: 'A',
        shiftString: '2811-622-hertzliya-629-hagana-27bt',
        startMinutes: 305,
        endMinutes: 640,
      }),
    );
    const succ = parseDuty(
      row({
        rowIndex: 2,
        serial: '68',
        workerNumber: 'B',
        shiftString: '238bt-hagana-629-ashkelon-640',
        startMinutes: 560,
        endMinutes: 915,
      }),
    );
    return { pred, succ, handoffs: detectHandoffs([pred, succ]) };
  }

  it('emits a crossing suggestion with no home stations at all', () => {
    const { pred, succ, handoffs } = crossingPair();
    const out = generateSwapSuggestions({
      duties: [pred, succ],
      handoffs,
      homesByWorkerNumber: homes([]),
    });

    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('ABSORB_HANDOFF');
    expect(out[0].rationale.code).toBe('DEADHEAD_CROSSING_UNVERIFIED');
    expect(out[0].savedMinutes).toBe(0);
    expect(out[0].score).toBeGreaterThan(0);
  });

  it('upgrades the rationale once both home stations are known', () => {
    const { pred, succ, handoffs } = crossingPair();
    const out = generateSwapSuggestions({
      duties: [pred, succ],
      handoffs,
      homesByWorkerNumber: homes([
        ['A', 'ashkelon'],
        ['B', 'hertzliya'],
      ]),
    });

    const crossing = out.find((s) => s.kind === 'ABSORB_HANDOFF');
    expect(crossing?.rationale.code).toBe('DEADHEAD_CROSSING');
    expect(crossing?.evidence.costBefore).not.toBeNull();
  });

  it('proposes an exchange when it shortens both commutes', () => {
    // A lives at Ashkelon but works the northern duty; B is the mirror image.
    const a = parseDuty(
      row({ rowIndex: 1, serial: '10', workerNumber: 'A', shiftString: '2501-502-505', routeNote: 'איסוף לנהריה ופיזור מנהריה' }),
    );
    const b = parseDuty(
      row({ rowIndex: 2, serial: '11', workerNumber: 'B', shiftString: '2502-503-506', routeNote: 'איסוף לאשקלון ופיזור מאשקלון' }),
    );

    const out = generateSwapSuggestions({
      duties: [a, b],
      handoffs: [],
      homesByWorkerNumber: homes([
        ['A', 'ashkelon'],
        ['B', 'nahariya'],
      ]),
    });

    const swap = out.find((s) => s.kind === 'SWAP_DUTIES');
    expect(swap).toBeDefined();
    expect(swap!.savedMinutes).toBeGreaterThan(0);
    expect(swap!.evidence.costAfter!).toBeLessThan(swap!.evidence.costBefore!);
  });

  it('never pairs a reinforcement duty with a primary one', () => {
    const a = parseDuty(
      row({ rowIndex: 1, serial: '10', workerNumber: 'A', shiftString: '2501-502', routeNote: 'איסוף לנהריה ופיזור מנהריה' }),
    );
    const b = parseDuty(
      row({ rowIndex: 2, serial: 'משני11', workerNumber: 'B', shiftString: '2502-503', routeNote: 'איסוף לאשקלון ופיזור מאשקלון' }),
    );

    const out = generateSwapSuggestions({
      duties: [a, b],
      handoffs: [],
      homesByWorkerNumber: homes([
        ['A', 'ashkelon'],
        ['B', 'nahariya'],
      ]),
    });
    expect(out.filter((s) => s.kind === 'SWAP_DUTIES')).toHaveLength(0);
  });

  it('skips pairs where a home station is missing rather than assuming zero', () => {
    const a = parseDuty(row({ rowIndex: 1, serial: '10', workerNumber: 'A', shiftString: '2501-502' }));
    const b = parseDuty(row({ rowIndex: 2, serial: '11', workerNumber: 'B', shiftString: '2502-503' }));
    const out = generateSwapSuggestions({
      duties: [a, b],
      handoffs: [],
      homesByWorkerNumber: homes([['A', 'ashkelon']]),
    });
    expect(out).toHaveLength(0);
  });
});
