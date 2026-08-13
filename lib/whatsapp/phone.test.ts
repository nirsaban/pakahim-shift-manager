import { describe, expect, it } from 'vitest';
import { normalizeIsraeliPhone, toWhatsAppJid } from './phone';

describe('Israeli phone normalization', () => {
  it('accepts the local form workers actually type', () => {
    expect(normalizeIsraeliPhone('0521234567')).toBe('972521234567');
    expect(normalizeIsraeliPhone('052-123-4567')).toBe('972521234567');
    expect(normalizeIsraeliPhone('052 123 4567')).toBe('972521234567');
    expect(normalizeIsraeliPhone('(052) 123-4567')).toBe('972521234567');
  });

  it('accepts international forms', () => {
    expect(normalizeIsraeliPhone('+972521234567')).toBe('972521234567');
    expect(normalizeIsraeliPhone('972521234567')).toBe('972521234567');
    expect(normalizeIsraeliPhone('00972521234567')).toBe('972521234567');
    expect(normalizeIsraeliPhone('+972 52 123 4567')).toBe('972521234567');
  });

  it('drops the trunk zero written after the country code', () => {
    expect(normalizeIsraeliPhone('+9720521234567')).toBe('972521234567');
  });

  it('accepts the national form with no trunk zero', () => {
    expect(normalizeIsraeliPhone('521234567')).toBe('972521234567');
  });

  it('rejects landlines, which cannot receive WhatsApp', () => {
    expect(normalizeIsraeliPhone('03-1234567')).toBeNull();
    expect(normalizeIsraeliPhone('+97231234567')).toBeNull();
  });

  it('rejects wrong-length and empty input rather than guessing', () => {
    expect(normalizeIsraeliPhone('052123456')).toBeNull();
    expect(normalizeIsraeliPhone('05212345678')).toBeNull();
    expect(normalizeIsraeliPhone('')).toBeNull();
    expect(normalizeIsraeliPhone(null)).toBeNull();
    expect(normalizeIsraeliPhone(undefined)).toBeNull();
    expect(normalizeIsraeliPhone('not a phone')).toBeNull();
  });

  it('builds the JID Baileys addresses', () => {
    expect(toWhatsAppJid('972521234567')).toBe('972521234567@s.whatsapp.net');
  });
});
