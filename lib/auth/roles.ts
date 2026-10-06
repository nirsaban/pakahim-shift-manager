import type { UserRole } from '@prisma/client';

/**
 * The roles that work shifts: פקחים, and locomotive drivers in their own
 * tenant. Code that asks "is this a worker who can hold or cover a shift"
 * checks against this rather than naming one role - and pairs it with a
 * tenant check, which is what keeps a פקח from ever covering a driver.
 */
export const WORKER_ROLES: UserRole[] = ['PAKAHIM', 'DRIVER'];

export function isWorkerRole(role: string): boolean {
  return (WORKER_ROLES as string[]).includes(role);
}

/**
 * The drivers' roster admin acts as their team lead and admin. He is a DRIVER
 * with a permission, never ADMIN, so no פקחים admin check lets him through.
 */
export function isDriversAdmin(user: { role: string; isRosterAdmin: boolean }): boolean {
  return user.role === 'DRIVER' && user.isRosterAdmin;
}
