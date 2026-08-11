import { prisma } from './prisma';

let cachedTenantId: string | null = null;

/**
 * The app runs single-tenant today (no /t/[slug] routing yet) against the
 * one Tenant row created by prisma/seed.ts.
 */
export async function getDefaultTenantId(): Promise<string> {
  if (cachedTenantId) return cachedTenantId;
  const tenant = await prisma.tenant.findFirstOrThrow();
  cachedTenantId = tenant.id;
  return cachedTenantId;
}
