import { normalizeIsraeliPhone } from '../whatsapp/phone';

/**
 * Whether two phone numbers are the same Israeli mobile, however each is
 * written ("050-2582463", "0502582463", "+972 50 258 2463").
 *
 * A number that does not parse as a mobile never matches anything - not even
 * itself - because the phone is a driver's identity check: matching on raw
 * text would let "" or "-" match a contact with a missing number.
 */
export function isSamePhone(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizeIsraeliPhone(a);
  return left !== null && left === normalizeIsraeliPhone(b);
}
