/**
 * Golden-corpus verification for the roster parser.
 *
 *   npm run verify:roster
 *   npm run verify:roster -- path/to/other.xlsx
 *
 * Runs the whole grammar against the real Excel files with no database and no
 * Next runtime. Every expected number below was measured from the source files,
 * so this is a real golden file rather than an aspirational one.
 *
 * The assertion that matters most is #2: zero UNKNOWN tokens. It is what
 * established that the grammar is complete, and any drift in the roster format
 * trips it first.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';

import { extractRosterRows, parseSheetDate } from '../lib/roster/sheet';
import { parseDuty } from '../lib/roster/duty';
import { detectHandoffs } from '../lib/roster/handoff';
import type { ParsedDuty } from '../lib/roster/types';

const FIXTURE_DIR = process.env.ROSTER_FIXTURE_DIR ?? path.join(process.cwd(), 'fixtures', 'rosters');
const DEFAULT_FILES = ['13.08.26.xlsx', '12.08.26.xlsx'].map((f) => path.join(FIXTURE_DIR, f));

interface Loaded {
  file: string;
  sheetName: string;
  date: Date | null;
  duties: ParsedDuty[];
}

let failures = 0;
let checks = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  checks += 1;
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  const mark = ok ? '  ok  ' : ' FAIL ';
  const detail = ok ? String(actual) : `got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`;
  console.log(`${mark} ${label.padEnd(58)} ${detail}`);
}

function info(label: string, value: unknown): void {
  console.log(`  ..   ${label.padEnd(58)} ${value}`);
}

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((acc, v) => {
    acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {});
}

function load(file: string): Loaded {
  const workbook = XLSX.read(readFileSync(file), { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
  }) as unknown[][];
  const { rows } = extractRosterRows(rawRows);
  return { file, sheetName, date: parseSheetDate(sheetName), duties: rows.map((r) => parseDuty(r)) };
}

function main(): void {
  const args = process.argv.slice(2);
  const files = args.length > 0 ? args : DEFAULT_FILES;

  const missing = files.filter((f) => !existsSync(f));
  if (missing.length > 0) {
    console.error('Missing roster fixture(s):');
    missing.forEach((f) => console.error(`  ${f}`));
    console.error('\nThe real rosters are gitignored (they contain employee PII).');
    console.error('Set ROSTER_FIXTURE_DIR or pass file paths explicitly.');
    process.exit(2);
  }

  const loaded = files.map(load);
  const primary = loaded[0];

  console.log(`\n=== ${path.basename(primary.file)} (sheet ${primary.sheetName}) ===\n`);

  // --- 1. Extraction -------------------------------------------------------
  check('rows extracted', primary.duties.length, 255);
  check('sheet name parsed as a date', primary.date !== null, true);
  check(
    'duties with a shift string but no worker assigned',
    primary.duties.filter((d) => !d.name && !d.workerNumber).length,
    13,
  );
  check('reinforcement (משני) duties', primary.duties.filter((d) => d.isReinforcement).length, 58);

  // --- 2. Grammar completeness --------------------------------------------
  const unknownTokens = primary.duties.flatMap((d) => d.tokens.filter((t) => t.kind === 'UNKNOWN'));
  check('UNKNOWN tokens across every shift string', unknownTokens.length, 0);
  if (unknownTokens.length > 0) {
    console.log('       offenders:', JSON.stringify(unknownTokens.slice(0, 10)));
  }

  const emptySegmentRows = primary.duties.filter((d) => d.warnings.some((w) => w.code === 'EMPTY_SEGMENT'));
  check('rows with a double-hyphen typo', emptySegmentRows.length, 2);
  check(
    'rows with trailing Hebrew prose',
    primary.duties.filter((d) => d.trailingNote !== null).length,
    1,
  );

  // --- 3. The separator-abusing tokens ------------------------------------
  const otems = primary.duties.flatMap((d) => d.legs.filter((l) => l.opCode === 'otem'));
  check('otem legs', otems.length, 17);
  check(
    'otem legs carrying an operand pair have exactly 2 operands',
    otems.filter((l) => l.opOperands.length > 0).every((l) => l.opOperands.length === 2),
    true,
  );
  check(
    'nikayon-kibui fused into a single op',
    primary.duties.flatMap((d) => d.legs.filter((l) => l.opCode === 'nikayon_kibui')).length > 0,
    true,
  );

  const transitForms = new Set(
    primary.duties.flatMap((d) => d.tokens.filter((t) => t.kind === 'TRANSIT').map((t) => t.form)),
  );
  check('all three BT spellings present', [...transitForms].sort(), ['detached', 'prefix', 'suffix']);
  check(
    'every TRANSIT leg is marked non-duty',
    primary.duties.flatMap((d) => d.legs.filter((l) => l.kind === 'TRANSIT')).every((l) => !l.isDuty),
    true,
  );

  // Regression guard for the detached `139-bt`: if rule 4 stops firing, 139
  // becomes an active train and this duty emits a phantom handoff.
  const detached = primary.duties.find((d) => /139-bt$/.test(d.shiftString));
  check('detached-bt row parses its tail as transit', detached?.legs.at(-1)?.kind, 'TRANSIT');
  check('detached-bt row last active train', detached?.lastActiveTrain, '139');

  // --- 4. Route notes ------------------------------------------------------
  const withNote = primary.duties.filter((d) => d.routeNote !== null);
  const rawNotes = primary.duties.map((d) => d.routeNote?.raw).filter(Boolean);
  check('route notes parsed', withNote.length, 159);
  check('distinct route notes', new Set(rawNotes).size, 65);
  check(
    'route notes yielding neither endpoint',
    withNote.filter((d) => !d.routeNote?.pickupTo && !d.routeNote?.dispersalFrom).length,
    0,
  );
  const unresolvedPlaces = new Set(
    primary.duties.flatMap((d) =>
      d.warnings.filter((w) => w.code === 'UNRESOLVED_STATION').map((w) => w.detail ?? ''),
    ),
  );
  info('route-note places not in the station dictionary', unresolvedPlaces.size);
  if (unresolvedPlaces.size > 0) {
    console.log('       ', JSON.stringify([...unresolvedPlaces].slice(0, 15), null, 0));
  }

  // --- 4b. Transport mode --------------------------------------------------
  // A taxi note and a bt leg are alternatives, never both at the same end.
  const startModes = countBy(primary.duties.map((d) => d.startTransport));
  const endModes = countBy(primary.duties.map((d) => d.endTransport));
  check('start transport: taxi / rail / neither', [startModes.TAXI, startModes.RAIL, startModes.NONE], [99, 56, 100]);
  check('end transport: taxi / rail / neither', [endModes.TAXI, endModes.RAIL, endModes.NONE], [94, 57, 104]);

  check(
    'no duty is collected by taxi AND rides a bt in to the start',
    primary.duties.filter((d) => {
      if (d.startTransport !== 'TAXI') return false;
      const firstActive = d.legs.findIndex((l) => l.kind === 'TRAIN' && l.isDuty);
      return firstActive > 0 && d.legs.slice(0, firstActive).some((l) => l.kind === 'TRANSIT');
    }).length,
    0,
  );

  // --- 5. Station endpoints ------------------------------------------------
  // The Lod convention may only fill the FINAL movement leg. Applying it to an
  // interior train->train transfer would invent a station and poison every
  // distance calculation; those must stay INFERRED_TRANSFER with a null station.
  check(
    'Lod default only ever fills the terminal movement leg',
    primary.duties.every((d) => {
      const movement = d.legs.filter((l) => ['TRAIN', 'TRANSIT', 'TAXI'].includes(l.kind));
      return movement.slice(0, -1).every((l) => l.toSource !== 'DEFAULT_LOD');
    }),
    true,
  );
  check(
    'interior transfers keep a null station rather than guessing',
    primary.duties.every((d) =>
      d.legs.every((l) => l.toSource !== 'INFERRED_TRANSFER' || l.toStation === null),
    ),
    true,
  );
  info('duties with a resolved end station', primary.duties.filter((d) => d.endStation).length);

  // --- 6. Handoffs ---------------------------------------------------------
  const handoffs = detectHandoffs(primary.duties);
  const successors = new Map<number, number>();
  for (const h of handoffs) {
    successors.set(h.successor.rowIndex, (successors.get(h.successor.rowIndex) ?? 0) + 1);
  }
  const ambiguous = [...successors.values()].filter((n) => n > 1).length;

  check('handoffs detected (window 90)', handoffs.length, 89);
  check('distinct successors', successors.size, 89);
  check('ambiguous successors', ambiguous, 0);

  const crossings = handoffs.filter((h) => h.bothSidesDeadhead);
  check('both-sides dead-head crossings', crossings.length, 43);
  check(
    'every crossing has a known handoff station',
    crossings.every((h) => h.station !== null),
    true,
  );

  // The briefed worked example: #21 hands train 510 to #74, while #75 merely
  // rides 510 as a passenger and must NOT be scored as the replacer.
  const train510 = handoffs.filter((h) => h.trainNumber === '510');
  check('train 510 has exactly one handoff', train510.length, 1);
  check('510 predecessor serial', train510[0]?.predecessor.serial, '21');
  check('510 successor serial', train510[0]?.successor.serial, '74');

  info('window sweep', JSON.stringify(
    [45, 60, 90, 120, 180].map((w) => `${w}:${detectHandoffs(primary.duties, { windowMinutes: w }).length}`),
  ));

  // --- 7. Cross-day template stability ------------------------------------
  if (loaded.length > 1) {
    const other = loaded[1];
    console.log(`\n=== cross-day: ${primary.sheetName} vs ${other.sheetName} ===\n`);

    const keyOf = (d: ParsedDuty) => `${d.section}|${d.serial}`;
    const otherByKey = new Map(other.duties.map((d) => [keyOf(d), d]));
    const shared = primary.duties.filter((d) => otherByKey.has(keyOf(d)));
    const identical = shared.filter((d) => otherByKey.get(keyOf(d))!.shiftString === d.shiftString);
    const sameHash = shared.filter((d) => otherByKey.get(keyOf(d))!.templateHash === d.templateHash);
    const sameWorker = shared.filter(
      (d) => d.workerNumber && otherByKey.get(keyOf(d))!.workerNumber === d.workerNumber,
    );

    check('duties present on both days', shared.length, 253);
    check('with a byte-identical shift string', identical.length, 224);
    check('templateHash agrees with string equality', sameHash.length, identical.length);
    check('same inspector on both days', sameWorker.length, 14);

    const nameOf = new Map<string, string>();
    let conflicts = 0;
    for (const d of [...primary.duties, ...other.duties]) {
      if (!d.workerNumber || !d.name) continue;
      const seen = nameOf.get(d.workerNumber);
      if (seen && seen !== d.name) conflicts += 1;
      nameOf.set(d.workerNumber, d.name);
    }
    check('workerNumber -> name conflicts', conflicts, 0);
    info('distinct worker numbers across both days', nameOf.size);
  }

  console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
