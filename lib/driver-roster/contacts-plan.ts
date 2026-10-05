import { normalizeIsraeliPhone } from '../whatsapp/phone';
import type { DriverContact } from './contacts';

/**
 * What importing a contact list would change, worked out before anything is
 * written - so the import can print it as a dry run and apply exactly that.
 *
 * Kept pure (no Prisma) so the matching rules are tested on their own.
 */

export interface ExistingDriver {
  id: string;
  workerNumber: string | null;
  firstName: string | null;
  city: string | null;
  phone: string | null;
  /** Set once the driver has completed their first login. */
  email: string | null;
}

export interface DriverFields {
  workerNumber: string | null;
  firstName: string;
  city: string | null;
  phone: string | null;
}

export interface ContactsImportPlan {
  create: DriverFields[];
  update: { id: string; name: string; changes: Partial<DriverFields> }[];
  unchanged: number;
  /** Drivers in the database the list no longer mentions. Reported, never deleted. */
  notInList: ExistingDriver[];
}

export function planContactsImport(contacts: DriverContact[], existing: ExistingDriver[]): ContactsImportPlan {
  const byNumber = new Map(existing.filter((d) => d.workerNumber).map((d) => [d.workerNumber!, d]));
  const byPhone = new Map(
    existing.flatMap((d) => {
      const phone = normalizeIsraeliPhone(d.phone);
      return phone ? [[phone, d] as const] : [];
    }),
  );
  const matched = new Set<string>();
  const plan: ContactsImportPlan = { create: [], update: [], unchanged: 0, notInList: [] };

  for (const contact of contacts) {
    const fields: DriverFields = {
      workerNumber: contact.workerNumber,
      firstName: contact.name,
      city: contact.city,
      phone: contact.phone,
    };

    // Worker number first. Phone only for a row that has no worker number yet
    // (the list once lacked it) - never to move a phone onto someone else.
    let match = contact.workerNumber ? byNumber.get(contact.workerNumber) : undefined;
    if (!match) {
      const phone = normalizeIsraeliPhone(contact.phone);
      const candidate = phone ? byPhone.get(phone) : undefined;
      if (candidate && !candidate.workerNumber && !matched.has(candidate.id)) match = candidate;
    }

    if (!match) {
      plan.create.push(fields);
      continue;
    }
    matched.add(match.id);

    const changes: Partial<DriverFields> = {};
    if (fields.firstName !== match.firstName) changes.firstName = fields.firstName;
    if (fields.city && fields.city !== match.city) changes.city = fields.city;
    if (fields.workerNumber && !match.workerNumber) changes.workerNumber = fields.workerNumber;
    // Once a driver has logged in, the phone is theirs to keep: it is how they
    // log in from then on, and the list may be older than their new number.
    if (!match.email && fields.phone && normalizeIsraeliPhone(fields.phone) !== normalizeIsraeliPhone(match.phone)) {
      changes.phone = fields.phone;
    }

    if (Object.keys(changes).length > 0) plan.update.push({ id: match.id, name: contact.name, changes });
    else plan.unchanged += 1;
  }

  plan.notInList = existing.filter((d) => !matched.has(d.id));
  return plan;
}
