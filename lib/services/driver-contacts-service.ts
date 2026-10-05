import { prisma } from '../db/prisma';
import { DRIVERS_TENANT_SLUG } from '../db/tenant';
import type { DriverContact } from '../driver-roster/contacts';
import { planContactsImport, type ContactsImportPlan } from '../driver-roster/contacts-plan';

/**
 * Loads the drivers' contact list into the drivers tenant.
 *
 * Drivers arrive already known - name, city, phone, worker number - so their
 * first login only asks for an email, never for a registration form. Nothing
 * here touches the פקחים tenant: every read and write is scoped to the drivers
 * tenant, which this creates on first run.
 */

const DRIVERS_TENANT_NAME = 'נהגי קטר';

/** Phase 1 covers the south only; the north is out of scope (2026-10-05). */
export const DRIVERS_SOUTH_TEAM = 'דרום';

export interface ImportDriverContactsInput {
  contacts: DriverContact[];
  /** Worker number of the driver who may upload rosters, and who leads the team. */
  rosterAdminWorkerNumber: string;
  /** False: work out and return the plan, write nothing. */
  apply: boolean;
}

export interface ImportDriverContactsResult {
  plan: ContactsImportPlan;
  rosterAdminName: string;
}

export async function importDriverContacts(input: ImportDriverContactsInput): Promise<ImportDriverContactsResult> {
  const tenant = await prisma.tenant.findUnique({ where: { slug: DRIVERS_TENANT_SLUG } });
  const existing = tenant
    ? await prisma.user.findMany({
        where: { tenantId: tenant.id, role: 'DRIVER' },
        select: { id: true, workerNumber: true, firstName: true, city: true, phone: true, email: true },
      })
    : [];

  // Checked before any write: without the roster admin there is no team lead,
  // and a half-imported tenant with no one able to upload is worse than none.
  const adminContact = input.contacts.find((c) => c.workerNumber === input.rosterAdminWorkerNumber);
  const adminExisting = existing.find((d) => d.workerNumber === input.rosterAdminWorkerNumber);
  const rosterAdminName = adminContact?.name ?? adminExisting?.firstName;
  if (!rosterAdminName) {
    throw new Error(`Roster admin ${input.rosterAdminWorkerNumber} is neither in the list nor already imported.`);
  }

  const plan = planContactsImport(input.contacts, existing);
  if (!input.apply) return { plan, rosterAdminName };

  await prisma.$transaction(async (tx) => {
    const { id: tenantId } = await tx.tenant.upsert({
      where: { slug: DRIVERS_TENANT_SLUG },
      update: {},
      create: { slug: DRIVERS_TENANT_SLUG, name: DRIVERS_TENANT_NAME },
    });

    if (plan.create.length > 0) {
      await tx.user.createMany({ data: plan.create.map((d) => ({ ...d, tenantId, role: 'DRIVER' as const })) });
    }
    for (const { id, changes } of plan.update) {
      await tx.user.update({ where: { id }, data: changes });
    }

    const admin = await tx.user.update({
      where: { tenantId_workerNumber: { tenantId, workerNumber: input.rosterAdminWorkerNumber } },
      data: { isRosterAdmin: true },
    });

    const team = await tx.team.upsert({
      where: { tenantId_name: { tenantId, name: DRIVERS_SOUTH_TEAM } },
      update: {},
      create: { tenantId, name: DRIVERS_SOUTH_TEAM, teamLeadId: admin.id },
    });
    await tx.user.updateMany({ where: { tenantId, role: 'DRIVER', teamId: null }, data: { teamId: team.id } });
  });

  return { plan, rosterAdminName };
}
