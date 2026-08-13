/**
 * Israeli phone numbers to WhatsApp's E.164-without-plus form.
 *
 * Workers type their number however they normally write it - "052-123-4567",
 * "+972 52 123 4567", "0521234567" - and WhatsApp only addresses
 * `972521234567@s.whatsapp.net`. Getting this wrong means the OTP silently goes
 * nowhere, so anything that does not confidently parse returns null and the
 * caller falls back to email rather than sending into the void.
 */

const IL_COUNTRY_CODE = '972';

export function normalizeIsraeliPhone(input: string | null | undefined): string | null {
  if (!input) return null;

  // Keep digits only; a leading "+" carries no information once we know the
  // country code, and separators vary too much to be worth interpreting.
  let digits = input.replace(/\D/g, '');
  if (!digits) return null;

  // "00972..." - the international prefix written out longhand.
  if (digits.startsWith('00')) digits = digits.slice(2);

  if (digits.startsWith(IL_COUNTRY_CODE)) {
    const national = digits.slice(IL_COUNTRY_CODE.length);
    // A trunk "0" is not dialled internationally: 972 0 52... is really 972 52...
    const trimmed = national.startsWith('0') ? national.slice(1) : national;
    return isIsraeliMobile(trimmed) ? IL_COUNTRY_CODE + trimmed : null;
  }

  // Local form: 05X-XXXXXXX.
  if (digits.startsWith('0')) {
    const trimmed = digits.slice(1);
    return isIsraeliMobile(trimmed) ? IL_COUNTRY_CODE + trimmed : null;
  }

  // Already national-without-trunk, e.g. "521234567".
  return isIsraeliMobile(digits) ? IL_COUNTRY_CODE + digits : null;
}

/**
 * Israeli mobile prefixes are 5X followed by seven digits (9 in total without
 * the trunk zero). Landlines are deliberately rejected - they cannot receive a
 * WhatsApp message, so accepting them would just produce a silent failure.
 */
function isIsraeliMobile(national: string): boolean {
  return /^5\d{8}$/.test(national);
}

/** WhatsApp JID for a normalized number. */
export function toWhatsAppJid(normalized: string): string {
  return `${normalized}@s.whatsapp.net`;
}
