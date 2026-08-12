// Train-number -> line mapping and each line's ordered station sequence,
// transcribed from the official inspectors' booklet "קווים וסיורים"
// (docs/reference/lines-and-patrols-25.12.25.pdf): page 2 is the range index,
// pages 3-18 are one strip-map per line.
//
// Where page 2 and a detail page disagree on the range bounds (19-59 vs 19-58,
// 60-99 vs 59-99, 700-710 vs 701-710) the detail page wins, except that we keep
// 700 inside the night-train range because roster codes use it.

import { DEFAULT_STATION_CODE } from './stations';

export interface TrainLineRef {
  code: string;
  nameHe: string;
  rangeStart: number;
  rangeEnd: number;
  /** Ordered station codes, one direction. Distances are symmetric. */
  stops: string[];
  /**
   * True when the line itself is inferred rather than read off the booklet.
   * Uncertain lines are usable for labelling but are excluded from dead-head
   * distance scoring - see stopDistance().
   */
  uncertain?: boolean;
}

export const TRAIN_LINES: TrainLineRef[] = [
  {
    code: 'nahariya_natbag_night',
    nameHe: 'נהריה-נתב"ג (רכבות לילה)',
    rangeStart: 1,
    rangeEnd: 10,
    stops: ['nahariya', 'ako', 'kiryat_motzkin', 'haifa_merkaz', 'haifa_hof_hacarmel', 'binyamina', 'hadera_maarav', 'netanya', 'hertzliya', 'savidor', 'natbag'],
  },
  {
    code: 'nahariya_beer_sheva',
    nameHe: 'נהריה/ת"א סבידור מרכז-באר שבע מרכז',
    rangeStart: 19,
    rangeEnd: 58,
    stops: ['nahariya', 'ako', 'kiryat_motzkin', 'merkazit_hamifratz', 'haifa_merkaz', 'haifa_bat_galim', 'haifa_hof_hacarmel', 'hadera_maarav', 'hertzliya', 'ta_university_expo', 'savidor', 'ta_hashalom', 'hagana', 'lod', 'ramla', 'mazkeret_batya', 'kiryat_malachi_yoav', 'kiryat_gat', 'lehavim_rahat', 'beer_sheva_universita', 'beer_sheva_merkaz'],
  },
  {
    code: 'beit_shean_atlit',
    nameHe: 'בית שאן-עתלית',
    rangeStart: 59,
    rangeEnd: 99,
    stops: ['beit_shean', 'afula', 'migdal_haemek', 'yokneam', 'merkazit_hamifratz', 'haifa_merkaz', 'haifa_bat_galim', 'haifa_hof_hacarmel', 'atlit'],
  },
  {
    code: 'nahariya_modiin',
    nameHe: 'נהריה-מודיעין מרכז',
    rangeStart: 100,
    rangeEnd: 199,
    stops: ['nahariya', 'ako', 'kiryat_motzkin', 'kiryat_haim', 'hutzot_hamifratz', 'merkazit_hamifratz', 'haifa_merkaz', 'haifa_bat_galim', 'haifa_hof_hacarmel', 'atlit', 'binyamina', 'ta_university_expo', 'savidor', 'ta_hashalom', 'hagana', 'natbag', 'paatei_modiin', 'modiin_merkaz'],
  },
  {
    code: 'binyamina_south',
    nameHe: 'בנימינה-רחובות/אשקלון/באר שבע מרכז',
    rangeStart: 200,
    rangeEnd: 299,
    stops: ['binyamina', 'caesarea_pardes_hana', 'hadera_maarav', 'netanya', 'netanya_sapir', 'beit_yehoshua', 'hertzliya', 'ta_university_expo', 'savidor', 'ta_hashalom', 'hagana', 'kfar_habad', 'lod_ganei_aviv', 'lod', 'beer_yaakov', 'rehovot', 'yavne_mizrah', 'ashdod', 'ashkelon', 'sderot', 'netivot', 'ofakim', 'beer_sheva_universita', 'beer_sheva_merkaz'],
  },
  {
    code: 'hertzliya_dayan_ashkelon',
    nameHe: 'הרצליה-ראשל"צ משה דיין/אשקלון',
    rangeStart: 300,
    rangeEnd: 349,
    stops: ['hertzliya', 'raanana_maarav', 'raanana_darom', 'hod_hasharon', 'kfar_saba_nordau', 'rosh_haayin_tzafon', 'petah_tikva_segula', 'petah_tikva_kiryat_arye', 'bnei_brak', 'ta_university_expo', 'savidor', 'ta_hashalom', 'hagana', 'tzomet_holon', 'holon_wolfson', 'bat_yam_yoseftal', 'bat_yam_komemiyut', 'dayan', 'yavne_maarav', 'ashdod', 'ashkelon'],
  },
  {
    code: 'carmiel_beer_sheva',
    nameHe: 'כרמיאל-באר שבע מרכז',
    rangeStart: 400,
    rangeEnd: 439,
    stops: ['carmiel', 'ahihud', 'kiryat_motzkin', 'merkazit_hamifratz', 'haifa_merkaz', 'haifa_bat_galim', 'haifa_hof_hacarmel', 'hadera_maarav', 'hertzliya', 'ta_university_expo', 'savidor', 'hagana', 'lod', 'ramla', 'kiryat_gat', 'lehavim_rahat', 'beer_sheva_universita', 'beer_sheva_merkaz'],
  },
  {
    code: 'carmiel_hof_hacarmel',
    nameHe: 'כרמיאל-חיפה חוף כרמל',
    rangeStart: 440,
    rangeEnd: 499,
    stops: ['carmiel', 'ahihud', 'kiryat_motzkin', 'kiryat_haim', 'hutzot_hamifratz', 'merkazit_hamifratz', 'haifa_merkaz', 'haifa_bat_galim', 'haifa_hof_hacarmel'],
  },
  {
    code: 'netanya_beit_shemesh',
    nameHe: 'נתניה/ת"א סבידור מרכז-בית שמש',
    rangeStart: 500,
    rangeEnd: 539,
    stops: ['netanya', 'netanya_sapir', 'beit_yehoshua', 'hertzliya', 'ta_university_expo', 'savidor', 'ta_hashalom', 'hagana', 'kfar_habad', 'lod', 'ramla', 'beit_shemesh'],
  },
  {
    code: 'modiin_navon',
    nameHe: 'מודיעין מרכז-ירושלים יצחק נבון',
    rangeStart: 540,
    rangeEnd: 599,
    stops: ['modiin_merkaz', 'paatei_modiin', 'navon'],
  },
  {
    code: 'hertzliya_south',
    nameHe: 'הרצליה-אשקלון/באר שבע מרכז',
    rangeStart: 600,
    rangeEnd: 699,
    stops: ['hertzliya', 'raanana_maarav', 'raanana_darom', 'hod_hasharon', 'kfar_saba_nordau', 'rosh_haayin_tzafon', 'petah_tikva_segula', 'petah_tikva_kiryat_arye', 'bnei_brak', 'ta_university_expo', 'savidor', 'ta_hashalom', 'hagana', 'tzomet_holon', 'holon_wolfson', 'bat_yam_yoseftal', 'bat_yam_komemiyut', 'dayan', 'yavne_maarav', 'ashdod', 'ashkelon', 'sderot', 'netivot', 'ofakim', 'beer_sheva_universita', 'beer_sheva_merkaz'],
  },
  {
    code: 'hertzliya_navon_night',
    nameHe: 'הרצליה-ירושלים יצחק נבון (רכבות לילה)',
    rangeStart: 700,
    rangeEnd: 710,
    stops: ['hertzliya', 'savidor', 'natbag', 'navon'],
  },
  {
    code: 'hertzliya_navon',
    nameHe: 'הרצליה-ירושלים יצחק נבון',
    rangeStart: 711,
    rangeEnd: 829,
    stops: ['hertzliya', 'ta_university_expo', 'savidor', 'ta_hashalom', 'hagana', 'natbag', 'navon'],
  },
  {
    code: 'beer_sheva_dimona',
    nameHe: 'באר שבע אוניברסיטה-דימונה',
    rangeStart: 830,
    rangeEnd: 839,
    stops: ['beer_sheva_universita', 'dimona'],
  },
  // Not in the booklet, which jumps 830-839 -> 900-949. Trains 840-881 appear
  // throughout both real rosters, always with route notes naming ראש העין צפון
  // and חדרה מזרח. Marked uncertain: it resolves for labelling but the stop list
  // is inferred from those notes, so stopDistance() refuses to score on it.
  {
    code: 'rosh_haayin_hadera_mizrah',
    nameHe: 'ראש העין צפון-חדרה מזרח (משוער)',
    rangeStart: 840,
    rangeEnd: 881,
    stops: ['rosh_haayin_tzafon', 'hadera_mizrah'],
    uncertain: true,
  },
  {
    code: 'lod_harishonim',
    nameHe: 'לוד-הראשונים',
    rangeStart: 900,
    rangeEnd: 949,
    stops: ['lod', 'harishonim'],
  },
  {
    code: 'netanya_ashkelon_beer_sheva',
    nameHe: 'נתניה/ת"א סבידור מרכז-אשקלון/באר שבע',
    rangeStart: 950,
    rangeEnd: 999,
    stops: ['netanya', 'netanya_sapir', 'beit_yehoshua', 'hertzliya', 'ta_university_expo', 'savidor', 'ta_hashalom', 'hagana', 'kfar_habad', 'lod_ganei_aviv', 'lod', 'beer_yaakov', 'rehovot', 'yavne_mizrah', 'ashdod', 'ashkelon', 'sderot', 'netivot', 'ofakim', 'beer_sheva_universita', 'beer_sheva_merkaz'],
  },
];

export interface LineResolution {
  line: TrainLineRef;
  /**
   * True when we had to strip a leading digit to land in a documented range.
   * These are near-certainly empty-set / depot moves: one roster note reads
   * "מפעיל את 985 כמערך ריק מרחובות לאשדוד".
   */
  isServiceMove: boolean;
}

/**
 * Map a train number to its line. Direct range lookup first; failing that, strip
 * one leading digit and retry. Measured on the two real rosters: 499/527 of the
 * 1-3 digit numbers hit directly, and 118/124 of the 4-digit numbers resolve via
 * the strip fallback.
 */
export function resolveLine(trainNumber: string | number): LineResolution | null {
  const digits = String(trainNumber).trim();
  if (!/^\d+$/.test(digits)) return null;

  const direct = findByNumber(Number(digits));
  if (direct) return { line: direct, isServiceMove: false };

  if (digits.length > 1) {
    const stripped = findByNumber(Number(digits.slice(1)));
    if (stripped) return { line: stripped, isServiceMove: true };
  }

  return null;
}

function findByNumber(n: number): TrainLineRef | null {
  return TRAIN_LINES.find((l) => n >= l.rangeStart && n <= l.rangeEnd) ?? null;
}

/**
 * Distance between two stations in stops, along whichever shared line makes them
 * closest. Returns null when no certain line carries both - callers fall back to
 * a coarser estimate rather than inventing a number.
 */
export function stopDistance(fromCode: string, toCode: string): number | null {
  if (fromCode === toCode) return 0;

  let best: number | null = null;
  for (const line of TRAIN_LINES) {
    if (line.uncertain) continue;
    const a = line.stops.indexOf(fromCode);
    const b = line.stops.indexOf(toCode);
    if (a === -1 || b === -1) continue;
    const d = Math.abs(a - b);
    if (best === null || d < best) best = d;
  }
  return best;
}

/** The terminus a line ends at, used when a duty's final station is implicit. */
export function lineTermini(line: TrainLineRef): [string, string] {
  return [line.stops[0], line.stops[line.stops.length - 1]];
}

export { DEFAULT_STATION_CODE };
