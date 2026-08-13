import { describe, expect, it } from 'vitest';
import { assignShiftIds, dedupeDutiesByIdentity, dutyIdentity } from './identity';
import type { ParsedDuty } from './types';

/** Only the fields duty identity cares about; the rest never reaches these functions. */
function duty(section: string, serial: string, rowIndex = 0): ParsedDuty {
  return { section, serial, rowIndex } as unknown as ParsedDuty;
}

describe('dedupeDutiesByIdentity', () => {
  it('keeps everything when every identity is distinct', () => {
    const duties = [duty('פקחים דרום', '1'), duty('פקחים דרום', '2'), duty('פקחים מרכז', '1')];
    const { kept, duplicates } = dedupeDutiesByIdentity(duties);
    expect(kept).toHaveLength(3);
    expect(duplicates).toHaveLength(0);
  });

  it('keeps the first line and reports the repeat', () => {
    const first = duty('פקחים דרום', '17', 4);
    const repeat = duty('פקחים דרום', '17', 91);
    const { kept, duplicates } = dedupeDutiesByIdentity([first, repeat]);
    expect(kept).toEqual([first]);
    expect(duplicates).toEqual([repeat]);
  });

  it('does not merge the same serial across different sections', () => {
    const { kept } = dedupeDutiesByIdentity([duty('פקחים דרום', '1'), duty('פקחים צפון', '1')]);
    expect(kept).toHaveLength(2);
  });

  it('collapses a serial repeated more than twice down to one', () => {
    const { kept, duplicates } = dedupeDutiesByIdentity([
      duty('כללי', '5', 1),
      duty('כללי', '5', 2),
      duty('כללי', '5', 3),
    ]);
    expect(kept).toHaveLength(1);
    expect(duplicates).toHaveLength(2);
  });

  it('is empty-safe', () => {
    expect(dedupeDutiesByIdentity([])).toEqual({ kept: [], duplicates: [] });
  });
});

describe('assignShiftIds', () => {
  it('matches each duty to its own shift', () => {
    const duties = [duty('דרום', '1'), duty('דרום', '2')];
    const map = new Map([
      [dutyIdentity('דרום', '1'), 'shift-a'],
      [dutyIdentity('דרום', '2'), 'shift-b'],
    ]);
    expect(assignShiftIds(duties, map)).toEqual(['shift-a', 'shift-b']);
  });

  it('leaves a duty unlinked when no shift matches', () => {
    expect(assignShiftIds([duty('דרום', '9')], new Map())).toEqual([null]);
  });

  it('is null-safe when the importer passed no map at all', () => {
    expect(assignShiftIds([duty('דרום', '1')], undefined)).toEqual([null]);
  });

  // Duty.shiftId is @unique — handing one shift to two duties is the P2002 that
  // wiped a whole date's roster layer in production on 2026-06-27.
  it('never hands the same shift to two duties', () => {
    const duties = [duty('דרום', '1'), duty('דרום', '2')];
    const map = new Map([
      [dutyIdentity('דרום', '1'), 'shift-a'],
      [dutyIdentity('דרום', '2'), 'shift-a'],
    ]);
    expect(assignShiftIds(duties, map)).toEqual(['shift-a', null]);
  });

  it('survives the real shape: duplicate identity deduped, then shift ids assigned', () => {
    const duties = [duty('דרום', '1', 1), duty('דרום', '1', 2), duty('דרום', '2', 3)];
    const map = new Map([
      [dutyIdentity('דרום', '1'), 'shift-a'],
      [dutyIdentity('דרום', '2'), 'shift-b'],
    ]);
    const { kept } = dedupeDutiesByIdentity(duties);
    const ids = assignShiftIds(kept, map);
    expect(kept).toHaveLength(2);
    expect(ids).toEqual(['shift-a', 'shift-b']);
    expect(new Set(ids.filter(Boolean)).size).toBe(ids.filter(Boolean).length);
  });
});
