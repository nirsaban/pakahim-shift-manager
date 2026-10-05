import { readdirSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { canAccessPath, homePathFor, isDriverPath, parseWorkforce } from './workforce';

describe('parseWorkforce', () => {
  it('treats a session without a workforce as פקחים', () => {
    expect(parseWorkforce(undefined)).toBe('pakahim');
    expect(parseWorkforce(null)).toBe('pakahim');
  });

  it('reads drivers', () => {
    expect(parseWorkforce('drivers')).toBe('drivers');
  });

  it('never upgrades an unknown value to drivers', () => {
    expect(parseWorkforce('DRIVERS')).toBe('pakahim');
    expect(parseWorkforce('admin')).toBe('pakahim');
  });
});

describe('isDriverPath', () => {
  it('matches the driver prefixes on a segment boundary', () => {
    expect(isDriverPath('/drivers')).toBe(true);
    expect(isDriverPath('/drivers/upload')).toBe(true);
    expect(isDriverPath('/api/drivers')).toBe(true);
    expect(isDriverPath('/api/drivers/roster')).toBe(true);
  });

  it('does not match a path that only starts with the same letters', () => {
    expect(isDriverPath('/driversx')).toBe(false);
    expect(isDriverPath('/api/driversroster')).toBe(false);
  });
});

/**
 * Every page and API route under app/, as a URL path, read from disk rather
 * than listed by hand - so a route added later is covered without anyone
 * remembering to add it here.
 */
function appRoutes(): string[] {
  const appDir = join(__dirname, '..', '..', 'app');
  const routes: string[] = [];
  const walk = (dir: string, url: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        // Private folders (_components) are not routes; dynamic segments get
        // a sample value.
        if (entry.name.startsWith('_')) continue;
        const segment = entry.name.startsWith('[') ? 'sample-id' : entry.name;
        walk(join(dir, entry.name), `${url}/${segment}`);
      } else if (entry.name === 'page.tsx' || entry.name === 'route.ts') {
        routes.push(url || '/');
      }
    }
  };
  walk(appDir, '');
  return routes;
}

describe('canAccessPath', () => {
  // The routes the פקחים app has today, read from disk. They must all stay
  // open to a פקחים session: this is the "don't break the existing app"
  // guarantee.
  const pakahimPaths = appRoutes().filter((p) => !isDriverPath(p));

  it('finds the existing routes', () => {
    expect(pakahimPaths).toContain('/dashboard');
    expect(pakahimPaths).toContain('/api/uploads');
    expect(pakahimPaths.length).toBeGreaterThan(30);
  });

  it('keeps every existing route open to a פקחים session', () => {
    for (const path of pakahimPaths) {
      expect(canAccessPath(path, 'pakahim'), path).toBe(true);
    }
  });

  it('closes the driver routes to a פקחים session', () => {
    expect(canAccessPath('/drivers', 'pakahim')).toBe(false);
    expect(canAccessPath('/api/drivers/roster', 'pakahim')).toBe(false);
  });

  it('closes every פקחים route to a driver session', () => {
    for (const path of pakahimPaths.filter((p) => p !== '/api/auth/logout')) {
      expect(canAccessPath(path, 'drivers'), path).toBe(false);
    }
  });

  it('opens the driver routes and logout to a driver session', () => {
    expect(canAccessPath('/drivers', 'drivers')).toBe(true);
    expect(canAccessPath('/drivers/upload', 'drivers')).toBe(true);
    expect(canAccessPath('/api/drivers/roster', 'drivers')).toBe(true);
    expect(canAccessPath('/api/auth/logout', 'drivers')).toBe(true);
  });
});

describe('homePathFor', () => {
  it('sends each workforce to its own home', () => {
    expect(homePathFor('pakahim')).toBe('/dashboard');
    expect(homePathFor('drivers')).toBe('/drivers');
  });
});
