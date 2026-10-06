import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { findDriversByPhone } from '../auth/driver-auth';
import type { DriverFieldsInput } from '../validation/driver-admin';
import { DRIVERS_SOUTH_TEAM } from './driver-contacts-service';

/**
 * The roster admin's upkeep of the driver list: adding a driver the contact
 * list missed, and fixing a name, number, phone or city. Scoped to the
 * drivers tenant passed in; roles are never changed here.
 */

export type DriverAdminResult = { ok: true; id: string } | { ok: false; status: number; error: DriverAdminError };
export type DriverAdminError = 'not_found' | 'phone_taken' | 'worker_number_taken' | 'no_team';

export interface DriverListEntry {
  id: string;
  firstName: string | null;
  workerNumber: string | null;
  phone: string | null;
  city: string | null;
  /** Has completed a first login. */
  registered: boolean;
  isRosterAdmin: boolean;
}

export async function listDrivers(tenantId: string): Promise<DriverListEntry[]> {
  const drivers = await prisma.user.findMany({
    where: { tenantId, role: 'DRIVER' },
    orderBy: { firstName: 'asc' },
    select: { id: true, firstName: true, workerNumber: true, phone: true, city: true, email: true, isRosterAdmin: true },
  });
  return drivers.map(({ email, ...d }) => ({ ...d, registered: Boolean(email) }));
}

async function phoneTaken(tenantId: string, phone: string | null | undefined, exceptId?: string) {
  if (!phone) return false;
  return (await findDriversByPhone(tenantId, phone)).some((d) => d.id !== exceptId);
}

function uniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

export async function createDriver(tenantId: string, input: DriverFieldsInput): Promise<DriverAdminResult> {
  const team = await prisma.team.findUnique({ where: { tenantId_name: { tenantId, name: DRIVERS_SOUTH_TEAM } } });
  if (!team) return { ok: false, status: 409, error: 'no_team' };
  if (await phoneTaken(tenantId, input.phone)) return { ok: false, status: 409, error: 'phone_taken' };

  try {
    const driver = await prisma.user.create({
      data: {
        tenantId,
        role: 'DRIVER',
        teamId: team.id,
        firstName: input.firstName,
        workerNumber: input.workerNumber ?? null,
        phone: input.phone ?? null,
        city: input.city ?? null,
      },
    });
    return { ok: true, id: driver.id };
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, status: 409, error: 'worker_number_taken' };
    throw err;
  }
}

export async function updateDriver(tenantId: string, driverId: string, input: DriverFieldsInput): Promise<DriverAdminResult> {
  const driver = await prisma.user.findUnique({ where: { id: driverId } });
  // Another tenant's user reads as missing: the admin has no business knowing it exists.
  if (!driver || driver.tenantId !== tenantId || driver.role !== 'DRIVER') {
    return { ok: false, status: 404, error: 'not_found' };
  }
  if (await phoneTaken(tenantId, input.phone, driverId)) return { ok: false, status: 409, error: 'phone_taken' };

  try {
    await prisma.user.update({
      where: { id: driverId },
      data: {
        firstName: input.firstName,
        workerNumber: input.workerNumber ?? null,
        phone: input.phone ?? null,
        city: input.city ?? null,
      },
    });
    return { ok: true, id: driverId };
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, status: 409, error: 'worker_number_taken' };
    throw err;
  }
}
