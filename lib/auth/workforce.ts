/**
 * Which workforce a session belongs to: פקחים (the original app) or locomotive
 * drivers (נהגי קטר). Each is its own tenant with its own screens, and the
 * proxy uses this to keep a session inside its own half of the app - a driver
 * session never reaches a פקחים page or API, and the other way round.
 *
 * Kept free of Next/Prisma imports so the proxy and the tests can both use it.
 */

export type Workforce = 'pakahim' | 'drivers';

/**
 * Sessions issued before the drivers existed carry no workforce. Every one of
 * them is a פקחים session, so that is what a missing value means.
 */
export function parseWorkforce(value: unknown): Workforce {
  return value === 'drivers' ? 'drivers' : 'pakahim';
}

const DRIVER_PREFIXES = ['/drivers', '/api/drivers'];

/** Reachable by either workforce once signed in. */
const SHARED_PATHS = new Set(['/api/auth/logout']);

function underPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isDriverPath(pathname: string): boolean {
  return DRIVER_PREFIXES.some((prefix) => underPrefix(pathname, prefix));
}

/**
 * Whether an authenticated session of this workforce may open this path.
 *
 * Drivers get an allowlist (their own prefixes plus SHARED_PATHS) rather than a
 * denylist: a פקחים route added later is closed to them by default instead of
 * by someone remembering to exclude it.
 */
export function canAccessPath(pathname: string, workforce: Workforce): boolean {
  if (SHARED_PATHS.has(pathname)) return true;
  return workforce === 'drivers' ? isDriverPath(pathname) : !isDriverPath(pathname);
}

/** Where a session lands after login, or when it opens a path it may not. */
export function homePathFor(workforce: Workforce): string {
  return workforce === 'drivers' ? '/drivers' : '/dashboard';
}
