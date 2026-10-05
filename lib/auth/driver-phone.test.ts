import { describe, expect, it } from 'vitest';
import { isSamePhone } from './driver-phone';

describe('isSamePhone', () => {
  it('matches the same mobile however it is written', () => {
    for (const typed of ['0502582463', '050 258 2463', '+972 50-258-2463', '00972502582463']) {
      expect(isSamePhone(typed, '050-2582463'), typed).toBe(true);
    }
  });

  it('rejects a different number', () => {
    expect(isSamePhone('050-2582464', '050-2582463')).toBe(false);
  });

  it('never matches a missing or unparseable number, even to itself', () => {
    expect(isSamePhone(null, null)).toBe(false);
    expect(isSamePhone('', '')).toBe(false);
    expect(isSamePhone('-', '-')).toBe(false);
    // A landline cannot receive the code, so it is no identity either.
    expect(isSamePhone('03-1234567', '03-1234567')).toBe(false);
  });
});
