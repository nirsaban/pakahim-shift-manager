import { prisma } from '../db/prisma';
import { normalizeAlias, resolveCityStation } from '../reference/stations';

/**
 * Derive a home station from a worker's free-text city.
 *
 * On a miss, the city is recorded as an unresolved CITY alias rather than being
 * guessed. A wrong home station produces confidently wrong swap advice, which is
 * worse than none — and the unresolved rows are exactly the admin review queue.
 */
export async function resolveHomeStationForCity(
  city: string | null | undefined,
): Promise<{ stationId: string | null; source: 'DERIVED_FROM_CITY' | 'UNKNOWN' }> {
  if (!city?.trim()) return { stationId: null, source: 'UNKNOWN' };

  const normalized = normalizeAlias(city);

  // An admin may already have resolved this exact city by hand.
  const existing = await prisma.stationAlias.findUnique({
    where: { kind_normalized: { kind: 'CITY', normalized } },
    select: { stationId: true },
  });
  if (existing?.stationId) {
    await prisma.stationAlias.update({
      where: { kind_normalized: { kind: 'CITY', normalized } },
      data: { seenCount: { increment: 1 } },
    });
    return { stationId: existing.stationId, source: 'DERIVED_FROM_CITY' };
  }

  const code = resolveCityStation(city);
  if (code) {
    const station = await prisma.station.findUnique({ where: { code }, select: { id: true } });
    if (station) {
      await prisma.stationAlias.upsert({
        where: { kind_normalized: { kind: 'CITY', normalized } },
        update: { stationId: station.id, seenCount: { increment: 1 } },
        create: { kind: 'CITY', normalized, raw: city.trim(), stationId: station.id },
      });
      return { stationId: station.id, source: 'DERIVED_FROM_CITY' };
    }
  }

  // Unknown: queue it for review, do not guess.
  await prisma.stationAlias.upsert({
    where: { kind_normalized: { kind: 'CITY', normalized } },
    update: { seenCount: { increment: 1 } },
    create: { kind: 'CITY', normalized, raw: city.trim(), stationId: null },
  });
  return { stationId: null, source: 'UNKNOWN' };
}

/** The admin review queue: surface forms we have seen but cannot map. */
export async function listUnresolvedAliases(limit = 100) {
  return prisma.stationAlias.findMany({
    where: { stationId: null },
    orderBy: [{ seenCount: 'desc' }],
    take: limit,
  });
}

/** Backfill home stations for workers who already entered a city. */
export async function backfillHomeStations(tenantId: string): Promise<{ resolved: number; unresolved: number }> {
  const users = await prisma.user.findMany({
    where: { tenantId, city: { not: null }, homeStationId: null },
    select: { id: true, city: true },
  });

  let resolved = 0;
  let unresolved = 0;
  for (const user of users) {
    const { stationId, source } = await resolveHomeStationForCity(user.city);
    if (!stationId) {
      unresolved += 1;
      continue;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { homeStationId: stationId, homeStationSource: source },
    });
    resolved += 1;
  }
  return { resolved, unresolved };
}
