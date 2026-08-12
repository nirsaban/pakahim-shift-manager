/**
 * Seeds Israel Railways reference data: stations, their aliases, the train lines
 * and each line's ordered stops.
 *
 *   npm run db:seed:reference
 *
 * Idempotent upserts — safe to re-run, and deliberately separate from
 * prisma/seed.ts, which is destructive demo data. Nothing here is tenant-scoped.
 *
 * Source of truth is lib/reference/*.ts (transcribed from the ops booklet, see
 * docs/reference/README.md). The parser reads those directly; this script only
 * mirrors them into the DB for the UI, the city->station mapping and the
 * unresolved-alias review queue.
 */

import { config } from 'dotenv';

config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { STATIONS, CITY_TO_STATION, normalizeAlias } from '../lib/reference/stations';
import { TRAIN_LINES } from '../lib/reference/lines';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main(): Promise<void> {
  console.log('Seeding station reference data...');

  const stationIdByCode = new Map<string, string>();

  for (const s of STATIONS) {
    const station = await prisma.station.upsert({
      where: { code: s.code },
      update: { nameHe: s.nameHe, isUncertain: s.uncertain ?? false },
      create: { code: s.code, nameHe: s.nameHe, isUncertain: s.uncertain ?? false },
    });
    stationIdByCode.set(s.code, station.id);

    for (const alias of s.aliases) {
      // Latin aliases come from shift strings; Hebrew ones from route notes.
      const kind = /[֐-׿]/.test(alias) ? 'ROUTE_NOTE' : 'SHIFT_TOKEN';
      await prisma.stationAlias.upsert({
        where: { kind_normalized: { kind, normalized: normalizeAlias(alias) } },
        update: { stationId: station.id, raw: alias },
        create: { kind, normalized: normalizeAlias(alias), raw: alias, stationId: station.id },
      });
    }
  }
  console.log(`  ${STATIONS.length} stations`);

  for (const [city, code] of Object.entries(CITY_TO_STATION)) {
    const stationId = stationIdByCode.get(code);
    if (!stationId) {
      console.warn(`  ! city "${city}" maps to unknown station "${code}" — skipped`);
      continue;
    }
    await prisma.stationAlias.upsert({
      where: { kind_normalized: { kind: 'CITY', normalized: normalizeAlias(city) } },
      update: { stationId, raw: city },
      create: { kind: 'CITY', normalized: normalizeAlias(city), raw: city, stationId },
    });
  }
  console.log(`  ${Object.keys(CITY_TO_STATION).length} city mappings`);

  for (const l of TRAIN_LINES) {
    const line = await prisma.trainLine.upsert({
      where: { code: l.code },
      update: {
        nameHe: l.nameHe,
        rangeStart: l.rangeStart,
        rangeEnd: l.rangeEnd,
        isUncertain: l.uncertain ?? false,
      },
      create: {
        code: l.code,
        nameHe: l.nameHe,
        rangeStart: l.rangeStart,
        rangeEnd: l.rangeEnd,
        isUncertain: l.uncertain ?? false,
      },
    });

    // Stop order is the whole point of this table — rebuild it wholesale so a
    // corrected transcription cannot leave stale ordinals behind.
    await prisma.trainLineStop.deleteMany({ where: { lineId: line.id } });
    await prisma.trainLineStop.createMany({
      data: l.stops
        .map((stopCode, ordinal) => {
          const stationId = stationIdByCode.get(stopCode);
          if (!stationId) {
            console.warn(`  ! line ${l.code} references unknown station "${stopCode}" — skipped`);
            return null;
          }
          return { lineId: line.id, stationId, ordinal };
        })
        .filter((r): r is { lineId: string; stationId: string; ordinal: number } => r !== null),
    });
  }
  console.log(`  ${TRAIN_LINES.length} train lines`);

  const uncertainStations = STATIONS.filter((s) => s.uncertain).map((s) => s.code);
  const uncertainLines = TRAIN_LINES.filter((l) => l.uncertain).map((l) => l.code);
  if (uncertainStations.length || uncertainLines.length) {
    console.log('\n  Inferred (needs client confirmation — see docs/reference/README.md):');
    if (uncertainStations.length) console.log(`    stations: ${uncertainStations.join(', ')}`);
    if (uncertainLines.length) console.log(`    lines:    ${uncertainLines.join(', ')}`);
  }

  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
