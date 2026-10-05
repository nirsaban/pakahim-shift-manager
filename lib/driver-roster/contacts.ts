import { normalizeIsraeliPhone } from '../whatsapp/phone';
import { stripBidiMarks, type PdfTextItem } from './pdf';

/**
 * Parses the drivers' contact list ("אלפון נהגים") - a PDF of cards, one per
 * driver, each drawn as: name, "עיר: …", "מספר עובד: …", phone.
 *
 * Cards are recognised by what each line says rather than how large it is
 * drawn: the labels and the phone shape are fixed, so anything else on the
 * page is either known page furniture or the next driver's name.
 *
 * Lines are rebuilt from positions first. The PDF does not draw a line's
 * pieces in reading order - "עיר: באר שבע" arrives as "שבע", then "עיר: באר" -
 * so following the drawing order alone splits a city into a phantom driver.
 */

export interface DriverContact {
  name: string;
  city: string | null;
  workerNumber: string | null;
  /** As printed, e.g. "053-8286552". */
  phone: string | null;
  page: number;
}

export interface ContactsParse {
  contacts: DriverContact[];
  /** Problems that would keep a driver from logging in, one line each, for whoever runs the import. */
  warnings: string[];
}

const CITY_LABEL = /^עיר\s*:\s*(.*)$/;
const WORKER_NUMBER_LABEL = /^מספר עובד\s*:\s*(.*)$/;
const PHONE = /^0\d{1,2}-?\d{7}$/;
const PAGE_FOOTER = /^\d+\s*\/\s*\d+$/;
const PAGE_HEADER = [/^רכבת ישראל$/, /^אלפון נהגים/, /^רשימת הנהגים/];

function clean(text: string): string {
  return stripBidiMarks(text).replace(/\s+/g, ' ').trim();
}

function emptyToNull(text: string): string | null {
  const value = clean(text);
  return value ? value : null;
}

/** Pieces whose baselines differ by less than this are one line. */
const SAME_LINE_POINTS = 2;

type PositionedText = Pick<PdfTextItem, 'str' | 'x' | 'y'>;

/**
 * A page's text as lines, top to bottom, each read right to left.
 *
 * The phone sits level with the city line at the card's other edge, so it is
 * kept as a line of its own rather than merged into the city.
 */
function pageLines(items: PositionedText[]): string[] {
  const lines: { y: number; pieces: PositionedText[] }[] = [];
  for (const item of items) {
    if (!clean(item.str)) continue;
    const line = PHONE.test(clean(item.str))
      ? undefined
      : lines.find((l) => !PHONE.test(clean(l.pieces[0].str)) && Math.abs(l.y - item.y) < SAME_LINE_POINTS);
    if (line) line.pieces.push(item);
    else lines.push({ y: item.y, pieces: [item] });
  }
  return lines
    .sort((a, b) => b.y - a.y)
    .map((l) => clean(l.pieces.sort((a, b) => b.x - a.x).map((p) => p.str).join(' ')));
}

export function parseDriverContacts(pages: PositionedText[][]): ContactsParse {
  const contacts: DriverContact[] = [];
  let current: DriverContact | null = null;

  pages.forEach((items, index) => {
    for (const text of pageLines(items)) {
      if (PAGE_FOOTER.test(text) || PAGE_HEADER.some((re) => re.test(text))) continue;

      const city = text.match(CITY_LABEL);
      const workerNumber = text.match(WORKER_NUMBER_LABEL);

      if (city && current) current.city = emptyToNull(city[1]);
      else if (workerNumber && current) current.workerNumber = emptyToNull(workerNumber[1]);
      else if (PHONE.test(text) && current) current.phone = text;
      else if (!city && !workerNumber && !PHONE.test(text)) {
        current = { name: text, city: null, workerNumber: null, phone: null, page: index + 1 };
        contacts.push(current);
      }
    }
  });

  return { contacts, warnings: contactWarnings(contacts) };
}

function contactWarnings(contacts: DriverContact[]): string[] {
  const warnings: string[] = [];
  const byNumber = new Map<string, DriverContact[]>();
  const byPhone = new Map<string, DriverContact[]>();

  for (const contact of contacts) {
    const where = `${contact.name} (page ${contact.page})`;
    if (!contact.workerNumber) warnings.push(`${where}: no worker number - cannot log in`);
    else byNumber.set(contact.workerNumber, [...(byNumber.get(contact.workerNumber) ?? []), contact]);

    const phone = normalizeIsraeliPhone(contact.phone);
    if (!phone) warnings.push(`${where}: no usable mobile number - cannot receive a code`);
    else byPhone.set(phone, [...(byPhone.get(phone) ?? []), contact]);
  }

  for (const [number, group] of byNumber) {
    if (group.length > 1) warnings.push(`worker number ${number} appears ${group.length} times: ${group.map((c) => c.name).join(', ')}`);
  }
  for (const [phone, group] of byPhone) {
    if (group.length > 1) warnings.push(`phone ${phone} appears ${group.length} times: ${group.map((c) => c.name).join(', ')}`);
  }
  return warnings;
}
