import { describe, expect, it } from 'vitest';
import { tokenizeShiftString, stripTrailingHebrewProse } from './tokenize';
import type { Token } from './types';

const kinds = (s: string) => tokenizeShiftString(s).tokens.map((t) => t.kind);
const tokens = (s: string) => tokenizeShiftString(s).tokens;

describe('separator-abusing tokens', () => {
  it('fuses nikayon-kibui into one op', () => {
    const t = tokens('270-binyamina-277-290-nikayon-kibui');
    const ops = t.filter((x): x is Extract<Token, { kind: 'OPS' }> => x.kind === 'OPS');
    expect(ops).toHaveLength(1);
    expect(ops[0].code).toBe('nikayon_kibui');
    expect(ops[0].raw).toEqual(['nikayon', 'kibui']);
  });

  it('still reads nikayon and kibui when they stand alone', () => {
    const solo = tokens('968-lod-970-977-976-983-nikayon-2214');
    expect(solo.filter((x) => x.kind === 'OPS').map((x) => (x as never as { code: string }).code)).toEqual(['nikayon']);

    const kibui = tokens('konan_bnei_brak_tzaharaim-kibui');
    expect(kibui.filter((x) => x.kind === 'OPS').map((x) => (x as never as { code: string }).code)).toEqual(['kibui']);
  });

  it('reads the otem operand pair, which also splits on the separator', () => {
    const t = tokens('2504-503-508-otem-(508-511)-511');
    const otem = t.find((x) => x.kind === 'OPS') as Extract<Token, { kind: 'OPS' }>;
    expect(otem.code).toBe('otem');
    expect(otem.operands).toEqual(['508', '511']);
    // 508/511 inside the parens are operands, not additional active trains
    expect(t.filter((x) => x.kind === 'TRAIN').map((x) => (x as never as { train: string }).train)).toEqual([
      '2504',
      '503',
      '508',
      '511',
    ]);
  });

  it('accepts a bare otem with no operands', () => {
    const t = tokens('268bt-hagana-421-50-otem-nikayon-kibui');
    const otem = t.find((x) => x.kind === 'OPS' && x.code === 'otem') as Extract<Token, { kind: 'OPS' }>;
    expect(otem.operands).toEqual([]);
  });
});

describe('the three BT spellings', () => {
  it('reads the suffix form', () => {
    const t = tokens('242bt-hagana-162');
    expect(t[0]).toMatchObject({ kind: 'TRANSIT', train: '242', form: 'suffix' });
  });

  it('reads the prefix form', () => {
    const t = tokens('muchan_mitcham-bt230-ashkelon-konan-bt238');
    expect(t[1]).toMatchObject({ kind: 'TRANSIT', train: '230', form: 'prefix' });
    expect(t[4]).toMatchObject({ kind: 'TRANSIT', train: '238', form: 'prefix' });
  });

  it('reads the detached form and does not score the number as active duty', () => {
    const t = tokens('976bt-hagana-178-2319-mizrah-2380-139-haifa_merkaz-139-bt');
    expect(t.at(-1)).toMatchObject({ kind: 'TRANSIT', train: '139', form: 'detached' });
    expect(t.at(-1)?.raw).toEqual(['139', 'bt']);
    // exactly one active 139 remains — the one before haifa_merkaz
    expect(t.filter((x) => x.kind === 'TRAIN' && (x as never as { train: string }).train === '139')).toHaveLength(1);
  });
});

describe('parameterised tokens', () => {
  it('reads taxi with a station and a time', () => {
    const t = tokens('306-hertzliya-313-dayan-taxi_lod_09:55-2217-248');
    expect(t.find((x) => x.kind === 'TAXI')).toMatchObject({
      kind: 'TAXI',
      stationKey: 'lod',
      minutes: 9 * 60 + 55,
    });
  });

  it('handles a taxi station key containing underscores', () => {
    const t = tokens('271-280-binyamina-287-2240-lod-taxi_darom_00:10-2117');
    expect(t.find((x) => x.kind === 'TAXI')).toMatchObject({ stationKey: 'darom', minutes: 10 });
  });

  it('reads bdika with its set number', () => {
    expect(tokens('bdika_2837-2825-418')[0]).toMatchObject({ kind: 'INSPECTION', setNumber: '2837' });
  });

  it('splits konan into place and part of day', () => {
    expect(tokens('konan_tel_aviv_darom_erev')[0]).toMatchObject({
      kind: 'STANDBY',
      stationKey: 'tel_aviv_darom',
      partOfDay: 'erev',
    });
    expect(tokens('konan_navon')[0]).toMatchObject({ stationKey: 'navon', partOfDay: null });
    expect(tokens('konan')[0]).toMatchObject({ stationKey: null, partOfDay: null });
  });

  it('reads muchan standby with no place', () => {
    expect(tokens('muchan_boker')[0]).toMatchObject({
      kind: 'STANDBY',
      stationKey: null,
      partOfDay: 'boker',
    });
  });
});

describe('dirty input is recorded, never thrown', () => {
  it('records the double-hyphen typo and keeps both trains', () => {
    const r = tokenizeShiftString('8--21');
    expect(r.warnings.map((w) => w.code)).toContain('EMPTY_SEGMENT');
    expect(r.tokens.map((t) => (t as never as { train: string }).train)).toEqual(['8', '21']);
  });

  it('strips trailing Hebrew prose off the code', () => {
    const raw = 'nikayon-kibui                         מפעיל את 985 כמערך ריק מרחובות לאשדוד כפקח ראשי';
    const { code, note } = stripTrailingHebrewProse(raw);
    expect(code).toBe('nikayon-kibui');
    expect(note).toContain('מפעיל את 985');

    const r = tokenizeShiftString(raw);
    expect(r.trailingNote).toContain('מפעיל את 985');
    expect(r.tokens.map((t) => t.kind)).toEqual(['OPS']);
  });

  it('reports an empty shift string instead of crashing', () => {
    const r = tokenizeShiftString('');
    expect(r.tokens).toEqual([]);
    expect(r.warnings.map((w) => w.code)).toEqual(['EMPTY_SHIFT_STRING']);
  });
});

describe('station vs train precedence', () => {
  it('classifies known stations as stations and the rest as trains', () => {
    expect(kinds('2101-100-157-112-hagana-513bt')).toEqual([
      'TRAIN',
      'TRAIN',
      'TRAIN',
      'TRAIN',
      'STATION',
      'TRANSIT',
    ]);
  });

  it('marks a genuinely unrecognised token UNKNOWN rather than guessing', () => {
    const r = tokenizeShiftString('101-zzz_not_a_place-102');
    expect(r.tokens[1]).toMatchObject({ kind: 'UNKNOWN', text: 'zzz_not_a_place' });
    expect(r.warnings.map((w) => w.code)).toContain('UNKNOWN_TOKEN');
  });
});
