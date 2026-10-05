import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { parseDriverContacts } from './contacts';
import { readPdfTextItems } from './pdf';

// Each string on a line of its own, top to bottom - which is how the cards are
// laid out apart from the split-line case tested separately.
const items = (...strs: string[]) => strs.map((str, i) => ({ str, x: 100, y: 800 - i * 10 }));

// The page furniture every page of the real list carries.
const header = ['רכבת ישראל', 'אלפון נהגים | 2026', 'רשימת הנהגים לפי א׳-ב׳'];

describe('parseDriverContacts', () => {
  it('reads a card as name, city, worker number and phone', () => {
    const { contacts, warnings } = parseDriverContacts([
      items(...header, 'ישראל ישראלי', 'עיר: פתח תקווה', 'מספר עובד: 700001', '050-0000001', '1 / 2'),
    ]);
    expect(contacts).toEqual([
      { name: 'ישראל ישראלי', city: 'פתח תקווה', workerNumber: '700001', phone: '050-0000001', page: 1 },
    ]);
    expect(warnings).toEqual([]);
  });

  it('continues across pages and keeps the page of each card', () => {
    const { contacts } = parseDriverContacts([
      items(...header, 'א א', 'עיר: לוד', 'מספר עובד: 700001', '050-0000001'),
      items(...header, 'ב ב', 'עיר: יבנה', 'מספר עובד: 700002', '050-0000002'),
    ]);
    expect(contacts.map((c) => [c.name, c.page])).toEqual([
      ['א א', 1],
      ['ב ב', 2],
    ]);
  });

  it('joins a line the PDF draws in pieces, out of reading order', () => {
    const { contacts } = parseDriverContacts([
      [
        { str: 'א א', x: 266, y: 273 },
        { str: 'שבע', x: 269, y: 256 },
        { str: 'עיר: באר', x: 294, y: 256 },
        { str: 'מספר עובד: 700001', x: 249, y: 242 },
        // Level with the city line, at the other edge of the card.
        { str: '050-0000001', x: 27, y: 257 },
        { str: 'ב ב', x: 247, y: 210 },
      ],
    ]);
    expect(contacts.map((c) => c.name)).toEqual(['א א', 'ב ב']);
    expect(contacts[0]).toMatchObject({ city: 'באר שבע', workerNumber: '700001', phone: '050-0000001' });
  });

  it('accepts the phone before the labels', () => {
    const { contacts } = parseDriverContacts([items('א א', '050-0000001', 'עיר: לוד', 'מספר עובד: 700001')]);
    expect(contacts[0]).toMatchObject({ phone: '050-0000001', city: 'לוד', workerNumber: '700001' });
  });

  it('keeps a card with an empty label, and says why it cannot log in', () => {
    const { contacts, warnings } = parseDriverContacts([items('א א', 'עיר:', 'מספר עובד:', '050-0000001')]);
    expect(contacts[0]).toMatchObject({ city: null, workerNumber: null });
    expect(warnings).toEqual(['א א (page 1): no worker number - cannot log in']);
  });

  it('strips bidi marks around numbers', () => {
    const { contacts } = parseDriverContacts([items('א א', 'מספר עובד:‪ 700001‬', '050-0000001')]);
    expect(contacts[0].workerNumber).toBe('700001');
  });

  it('flags a worker number or phone shared by two drivers', () => {
    const { warnings } = parseDriverContacts([
      items('א א', 'מספר עובד: 700001', '050-0000001', 'ב ב', 'מספר עובד: 700001', '0500000001'),
    ]);
    expect(warnings).toEqual([
      'worker number 700001 appears 2 times: א א, ב ב',
      'phone 972500000001 appears 2 times: א א, ב ב',
    ]);
  });

  it('flags a driver with no mobile number', () => {
    const { warnings } = parseDriverContacts([items('א א', 'מספר עובד: 700001')]);
    expect(warnings).toEqual(['א א (page 1): no usable mobile number - cannot receive a code']);
  });
});

// The real list holds phone numbers, so it is gitignored. This only runs where
// it has been placed by hand.
const REAL_LIST = join(__dirname, '..', '..', 'fixtures', 'drivers', 'contacts.pdf');

describe.skipIf(!existsSync(REAL_LIST))('parseDriverContacts on the real list', () => {
  it('reads every card', async () => {
    const pages = await readPdfTextItems(new Uint8Array(readFileSync(REAL_LIST)));
    const { contacts, warnings } = parseDriverContacts(pages);

    expect(contacts).toHaveLength(291);
    expect(contacts.every((c) => c.phone)).toBe(true);
    expect(contacts.filter((c) => !c.workerNumber)).toHaveLength(16);
    expect(contacts[0]).toMatchObject({ name: 'אבי אזריאל', city: 'פתח תקווה', workerNumber: '796913' });
    // The roster admin, whose number the client gave us.
    expect(contacts.find((c) => c.workerNumber === '795580')).toMatchObject({
      name: 'איתן מיכאלי',
      phone: '050-2582463',
    });
    expect(warnings.filter((w) => !w.includes('no worker number'))).toEqual([]);
  });
});
