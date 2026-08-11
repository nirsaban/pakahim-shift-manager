// wa.me needs international format with no leading zero/plus - normalize
// Israeli local numbers ("05X-XXXXXXX") to "972...". Returns null for
// anything that doesn't look like a usable phone number.
export function toWhatsAppLink(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return null;

  const international = digits.startsWith('0') ? `972${digits.slice(1)}` : digits;
  return `https://wa.me/${international}`;
}
