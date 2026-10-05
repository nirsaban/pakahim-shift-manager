import { prisma } from '../db/prisma';
import { getDriversTenantId } from '../db/tenant';

/**
 * The signed-in user, if they may upload the drivers' roster: a driver of the
 * drivers tenant with isRosterAdmin. Read from the database on every call
 * rather than from the session, so revoking the flag takes effect at once.
 */
export async function findRosterAdmin(userId: string | null) {
  if (!userId) return null;
  const [user, tenantId] = await Promise.all([prisma.user.findUnique({ where: { id: userId } }), getDriversTenantId()]);
  if (!user || user.tenantId !== tenantId || user.role !== 'DRIVER' || !user.isRosterAdmin) return null;
  return user;
}
