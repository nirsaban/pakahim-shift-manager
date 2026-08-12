// Tokenizer for roster shift strings, e.g.
//   242bt-hagana-162-119-174-hagana-41bt
//   2504-503-508-otem-(508-511)-511
//   306-hertzliya-313-dayan-taxi_lod_09:55-2217-248
//
// The roster uses "-" both as the token separator AND inside several multi-part
// tokens, so a naive split is wrong in three specific ways. Everything here is
// pure; the station dictionary is injected so an admin adding a station teaches
// the tokenizer without a code deploy.

import { resolveStation } from '../reference/stations';
import type { OpCode, ParseWarning, PartOfDay, Token, TokenizeResult } from './types';

const OPS_CODES = new Set<OpCode>(['ptihat_set', 'neilat_set', 'blima', 'ituk', 'nikayon', 'kibui']);
const PART_OF_DAY: PartOfDay[] = ['boker', 'mitcham', 'tzaharaim', 'erev', 'niyud'];

export interface StationResolver {
  isStation(token: string): boolean;
}

const defaultResolver: StationResolver = {
  isStation: (token) => resolveStation(token) !== null,
};

const HEBREW = /[֐-׿]/;

/**
 * One cell (משני44) carries free Hebrew prose appended after the code, separated
 * by a run of spaces: "nikayon-kibui{29 spaces}מפעיל את 985 כמערך ריק...".
 * Split it off before tokenizing rather than letting it become UNKNOWN tokens.
 */
export function stripTrailingHebrewProse(raw: string): { code: string; note: string | null } {
  const idx = raw.search(HEBREW);
  if (idx === -1) return { code: raw, note: null };
  const code = raw.slice(0, idx).trim();
  const note = raw.slice(idx).trim();
  return { code, note: note.length > 0 ? note : null };
}

export function tokenizeShiftString(input: string, resolver: StationResolver = defaultResolver): TokenizeResult {
  const warnings: ParseWarning[] = [];
  const tokens: Token[] = [];

  const normalized = String(input ?? '').replace(/ /g, ' ').trim();
  if (!normalized) {
    warnings.push({ code: 'EMPTY_SHIFT_STRING' });
    return { tokens, warnings, trailingNote: null };
  }

  const { code, note: trailingNote } = stripTrailingHebrewProse(normalized);
  if (trailingNote) warnings.push({ code: 'TRAILING_PROSE', detail: trailingNote });

  // Split, then record (not silently drop) the empties that come from the two
  // double-hyphen typos in the real file: `8--21` and `2--6005-2132`.
  const rawSegments = code.split('-').map((s) => s.trim());
  const segments: string[] = [];
  rawSegments.forEach((seg, i) => {
    if (seg === '') {
      warnings.push({ code: 'EMPTY_SEGMENT', index: i });
      return;
    }
    segments.push(seg);
  });

  let i = 0;
  while (i < segments.length) {
    const seg = segments[i];
    const next = segments[i + 1];
    const next2 = segments[i + 2];
    let m: RegExpMatchArray | null;

    // 1. `otem-(508-511)` — the operand pair splits on "-" too, so consume 3.
    //    Must precede the bare-digits rule or `511)` becomes UNKNOWN.
    if (seg === 'otem' && next && next2 && /^\(\d+$/.test(next) && /^\d+\)$/.test(next2)) {
      tokens.push({
        kind: 'OPS',
        code: 'otem',
        operands: [next.slice(1), next2.slice(0, -1)],
        raw: [seg, next, next2],
      });
      i += 3;
      continue;
    }

    // 2. `otem` with no operand pair (it appears bare too).
    if (seg === 'otem') {
      tokens.push({ kind: 'OPS', code: 'otem', operands: [], raw: [seg] });
      i += 1;
      continue;
    }

    // 3. `nikayon-kibui` is one logical op split across the token separator.
    //    Must precede rule 11 or `kibui` gets consumed on its own.
    if (seg === 'nikayon' && next === 'kibui') {
      tokens.push({ kind: 'OPS', code: 'nikayon_kibui', operands: [], raw: [seg, next] });
      i += 2;
      continue;
    }

    // 4. Detached transit: `139-bt` (row 160). Must precede the bare-digits rule,
    //    otherwise 139 counts as active duty and emits a phantom handoff.
    if (/^\d{1,4}$/.test(seg) && next === 'bt') {
      tokens.push({ kind: 'TRANSIT', train: seg, form: 'detached', raw: [seg, next] });
      i += 2;
      continue;
    }

    // 5/6. Suffix and prefix transit spellings.
    if ((m = seg.match(/^(\d{1,4})bt$/))) {
      tokens.push({ kind: 'TRANSIT', train: m[1], form: 'suffix', raw: [seg] });
      i += 1;
      continue;
    }
    if ((m = seg.match(/^bt(\d{1,4})$/))) {
      tokens.push({ kind: 'TRANSIT', train: m[1], form: 'prefix', raw: [seg] });
      i += 1;
      continue;
    }

    // 7. `taxi_<station>_<HH:MM>` — station part may itself contain underscores.
    if ((m = seg.match(/^taxi_(.+)_(\d{1,2}):(\d{2})$/))) {
      tokens.push({
        kind: 'TAXI',
        stationKey: m[1],
        minutes: Number(m[2]) * 60 + Number(m[3]),
        raw: [seg],
      });
      i += 1;
      continue;
    }

    // 8. `bdika_2837`
    if ((m = seg.match(/^bdika_(\d+)$/))) {
      tokens.push({ kind: 'INSPECTION', setNumber: m[1], raw: [seg] });
      i += 1;
      continue;
    }

    // 9. `muchan_boker` etc — standby with no location.
    if ((m = seg.match(/^muchan_(\w+)$/))) {
      const part = PART_OF_DAY.find((p) => p === m![1]) ?? null;
      tokens.push({ kind: 'STANDBY', code: seg, stationKey: null, partOfDay: part, raw: [seg] });
      i += 1;
      continue;
    }

    // 10. `konan`, `konan_navon`, `konan_tel_aviv_darom_erev` — standby AT a place.
    if ((m = seg.match(/^konan(?:_(.+))?$/))) {
      const { stationKey, partOfDay } = splitKonanSuffix(m[1] ?? null);
      tokens.push({ kind: 'STANDBY', code: seg, stationKey, partOfDay, raw: [seg] });
      i += 1;
      continue;
    }

    // 11. Single-segment ops.
    if (OPS_CODES.has(seg as OpCode)) {
      tokens.push({ kind: 'OPS', code: seg as OpCode, operands: [], raw: [seg] });
      i += 1;
      continue;
    }

    // 12. Station, via the injected dictionary. Before bare digits so a future
    //     numeric station code stays safe.
    if (resolver.isStation(seg)) {
      tokens.push({ kind: 'STATION', stationKey: seg, raw: [seg] });
      i += 1;
      continue;
    }

    // 13. Active train.
    if (/^\d{1,4}$/.test(seg)) {
      tokens.push({ kind: 'TRAIN', train: seg, raw: [seg] });
      i += 1;
      continue;
    }

    // 14. Never throw — classify and record, so one grammar surprise can't block
    //     the daily roster import.
    tokens.push({ kind: 'UNKNOWN', text: seg, raw: [seg] });
    warnings.push({ code: 'UNKNOWN_TOKEN', detail: seg, index: i });
    i += 1;
  }

  return { tokens, warnings, trailingNote };
}

function splitKonanSuffix(suffix: string | null): { stationKey: string | null; partOfDay: PartOfDay | null } {
  if (!suffix) return { stationKey: null, partOfDay: null };
  for (const part of PART_OF_DAY) {
    if (suffix.endsWith(`_${part}`)) {
      return { stationKey: suffix.slice(0, -(part.length + 1)), partOfDay: part };
    }
  }
  return { stationKey: suffix, partOfDay: null };
}
