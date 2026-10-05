import { prisma } from './prisma';

/**
 * Slug of the פקחים tenant - the one created by prisma/seed.ts and
 * scripts/bootstrap-production.ts. Every פקחים code path resolves its tenant
 * through this, never through "the first tenant row": the locomotive drivers
 * live in a second tenant, and `findFirst()` would return either one.
 */
export const PAKAHIM_TENANT_SLUG = 'default';

let cachedTenantId: string | null = null;

/**
 * The פקחים tenant. The app has no /t/[slug] routing, so every פקחים route
 * resolves to this one tenant.
 */
export async function getDefaultTenantId(): Promise<string> {
  if (cachedTenantId) return cachedTenantId;
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: PAKAHIM_TENANT_SLUG } });
  cachedTenantId = tenant.id;
  return cachedTenantId;
}
