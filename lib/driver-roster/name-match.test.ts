import { describe, expect, it } from 'vitest';
import { matchDriverName } from './name-match';

const drivers = [
  { id: 'a', name: 'אבירם לאטמן' },
  { id: 'b', name: 'מיכאל קוליניץ' },
  { id: 'c', name: 'יצחק שלו' },
  { id: 'd', name: 'אבי אזריאל' },
  { id: 'e', name: 'אבי אזרי' },
  { id: 'f', name: 'משה אברהמי' },
  { id: 'g', name: 'משה אברהמוב' },
];

describe('matchDriverName', () => {
  it('matches the same name, ignoring spacing and punctuation', () => {
    expect(matchDriverName('אבי  אזריאל', drivers)).toEqual({ kind: 'exact', driverId: 'd' });
    expect(matchDriverName("אבי אזריאל*", drivers)).toEqual({ kind: 'exact', driverId: 'd' });
  });

  it('matches the same words in another order', () => {
    expect(matchDriverName('שלו יצחק', drivers)).toEqual({ kind: 'near', driverId: 'c', matchedName: 'יצחק שלו' });
  });

  it('matches a spelling a letter or two apart, when only one driver is that close', () => {
    expect(matchDriverName('אבירם לטמן', drivers)).toEqual({ kind: 'near', driverId: 'a', matchedName: 'אבירם לאטמן' });
    expect(matchDriverName('מיכאל קולניץ', drivers)).toEqual({ kind: 'near', driverId: 'b', matchedName: 'מיכאל קוליניץ' });
  });

  it('refuses to choose between two close names', () => {
    expect(matchDriverName('משה אברהמ', drivers)).toEqual({ kind: 'ambiguous', candidates: ['משה אברהמי', 'משה אברהמוב'] });
  });

  it('does not stretch a short name to a near spelling', () => {
    expect(matchDriverName('גל משה', [{ id: 'x', name: 'גל משיה' }]).kind).toBe('none');
  });

  it('leaves an unknown or empty name unmatched', () => {
    expect(matchDriverName('ישראל ישראלי', drivers)).toEqual({ kind: 'none' });
    expect(matchDriverName('', drivers)).toEqual({ kind: 'none' });
  });
});
