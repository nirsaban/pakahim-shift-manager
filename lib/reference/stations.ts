// Israel Railways stations, transcribed from the official inspectors' booklet
// "קווים וסיורים" (docs/reference/lines-and-patrols-25.12.25.pdf), pages 3-18.
//
// `code` is our canonical slug. `aliases` are every spelling that can appear in a
// roster shift string or in the Hebrew route notes - roster authors use a loose
// latin transliteration that is neither consistent nor complete, so alias
// resolution is deliberately generous.
//
// `uncertain: true` marks a station whose identity we inferred from surrounding
// roster notes rather than reading it off the booklet. See docs/reference/README.md.

export interface StationRef {
  code: string;
  nameHe: string;
  aliases: string[];
  uncertain?: boolean;
}

export const STATIONS: StationRef[] = [
  // --- North ---
  { code: 'nahariya', nameHe: 'נהריה', aliases: ['nahariya', 'נהריה'] },
  { code: 'ako', nameHe: 'עכו', aliases: ['ako', 'akko', 'עכו'] },
  { code: 'ahihud', nameHe: 'אחיהוד', aliases: ['ahihud', 'אחיהוד'] },
  { code: 'carmiel', nameHe: 'כרמיאל', aliases: ['carmiel', 'karmiel', 'כרמיאל'] },
  { code: 'kiryat_motzkin', nameHe: 'קריית מוצקין', aliases: ['kiryat_motzkin', 'קריית מוצקין', 'קרית מוצקין'] },
  { code: 'kiryat_haim', nameHe: 'קריית חיים', aliases: ['kiryat_haim', 'קריית חיים', 'קרית חיים'] },
  { code: 'hutzot_hamifratz', nameHe: 'חוצות המפרץ', aliases: ['hutzot_hamifratz', 'חוצות המפרץ'] },
  { code: 'merkazit_hamifratz', nameHe: 'מרכזית המפרץ', aliases: ['merkazit_hamifratz', 'mifratz', 'מרכזית המפרץ'] },
  { code: 'haifa_merkaz', nameHe: 'חיפה מרכז השמונה', aliases: ['haifa_merkaz', 'haifa', 'חיפה מרכז השמונה', 'חיפה מרכז'] },
  { code: 'haifa_bat_galim', nameHe: 'חיפה בת גלים', aliases: ['haifa_bat_galim', 'bat_galim', 'חיפה בת גלים'] },
  { code: 'haifa_hof_hacarmel', nameHe: 'חיפה חוף הכרמל', aliases: ['haifa_hof_hacarmel', 'hof_hacarmel', 'hof_carmel', 'חיפה חוף הכרמל', 'חוף הכרמל'] },
  { code: 'atlit', nameHe: 'עתלית', aliases: ['atlit', 'עתלית'] },

  // --- Jezreel / Beit She'an branch ---
  { code: 'beit_shean', nameHe: 'בית שאן', aliases: ['beit_shean', 'בית שאן'] },
  { code: 'afula', nameHe: 'עפולה', aliases: ['afula', 'עפולה'] },
  { code: 'migdal_haemek', nameHe: 'מגדל העמק-כפר ברוך', aliases: ['migdal_haemek', 'מגדל העמק', 'מגדל העמק-כפר ברוך'] },
  { code: 'yokneam', nameHe: 'יקנעם-כפר יהושוע', aliases: ['yokneam', 'יקנעם', 'יקנעם-כפר יהושוע'] },

  // --- Coastal ---
  { code: 'binyamina', nameHe: 'בנימינה', aliases: ['binyamina', 'בנימינה'] },
  { code: 'caesarea_pardes_hana', nameHe: 'קיסריה-פרדס חנה', aliases: ['caesarea', 'kesariya', 'קיסריה', 'קיסריה-פרדס חנה'] },
  // Bare "חדרה" in a route note resolves to מערב: it is the station on the
  // documented corridors, while חדרה מזרח only appears on the inferred 840-881 line.
  { code: 'hadera_maarav', nameHe: 'חדרה-מערב', aliases: ['hadera', 'hadera_maarav', 'חדרה', 'חדרה מערב', 'חדרה-מערב'] },
  // Not in the booklet. Roster notes ("איסוף ופיזור מ/אל חדרה מזרח") place a
  // חדרה מזרח on the undocumented 840-881 corridor; `mizrah` in a shift string
  // resolves here. Confirm with the client.
  { code: 'hadera_mizrah', nameHe: 'חדרה-מזרח', aliases: ['mizrah', 'hadera_mizrah', 'חדרה מזרח', 'חדרה-מזרח'], uncertain: true },
  { code: 'netanya', nameHe: 'נתניה', aliases: ['netanya', 'נתניה'] },
  { code: 'netanya_sapir', nameHe: 'נתניה-ספיר', aliases: ['netanya_sapir', 'sapir', 'נתניה ספיר', 'נתניה-ספיר'] },
  { code: 'beit_yehoshua', nameHe: 'בית יהושע', aliases: ['beit_yehoshua', 'בית יהושע'] },
  { code: 'hertzliya', nameHe: 'הרצליה', aliases: ['hertzliya', 'herzliya', 'הרצליה'] },

  // --- Sharon / Petah Tikva branch ---
  { code: 'raanana_maarav', nameHe: 'רעננה-מערב', aliases: ['raanana_maarav', 'רעננה מערב', 'רעננה-מערב'] },
  { code: 'raanana_darom', nameHe: 'רעננה-דרום', aliases: ['raanana_darom', 'רעננה דרום', 'רעננה-דרום'] },
  { code: 'hod_hasharon', nameHe: 'הוד השרון', aliases: ['hod_hasharon', 'הוד השרון'] },
  { code: 'kfar_saba_nordau', nameHe: 'כפר סבא-נורדאו', aliases: ['kfar_saba', 'kfar_saba_nordau', 'כפר סבא', 'כפר סבא-נורדאו'] },
  // `tzafon` on its own resolves here: it is the only "צפון" station on the
  // inspectors' corridors, and roster notes say "איסוף לראש העין צפון".
  { code: 'rosh_haayin_tzafon', nameHe: 'ראש העין-צפון', aliases: ['tzafon', 'rosh_haayin', 'rosh_haayin_tzafon', 'ראש העין צפון', 'ראש העין-צפון'] },
  { code: 'petah_tikva_segula', nameHe: 'פתח תקווה-סגולה', aliases: ['segula', 'petah_tikva_segula', 'פתח תקווה סגולה'] },
  { code: 'petah_tikva_kiryat_arye', nameHe: 'פתח תקווה-קרית אריה', aliases: ['kiryat_arye', 'petah_tikva_kiryat_arye', 'פתח תקווה קרית אריה'] },
  { code: 'bnei_brak', nameHe: 'בני ברק', aliases: ['bnei_brak', 'בני ברק'] },

  // --- Tel Aviv ---
  { code: 'ta_university_expo', nameHe: 'ת"א-אוני\' אקספו', aliases: ['university', 'expo', 'ta_university_expo', 'ת"א אוני\' אקספו', 'אוניברסיטה'] },
  // Route notes are normalized (ת"א -> תל אביב) before lookup, so both the
  // abbreviated and expanded Hebrew forms are listed.
  { code: 'savidor', nameHe: 'ת"א-סבידור מרכז', aliases: ['savidor', 'ta_savidor', 'ת"א סבידור מרכז', 'תל אביב סבידור מרכז', 'סבידור'] },
  { code: 'ta_hashalom', nameHe: 'ת"א-השלום', aliases: ['hashalom', 'ta_hashalom', 'ת"א השלום', 'תל אביב השלום'] },
  // Tel Aviv HaHagana was historically "תל אביב דרום"; roster standby tokens
  // (konan_tel_aviv_darom_*) and taxi_darom_* still use the old name.
  { code: 'hagana', nameHe: 'ת"א-ההגנה', aliases: ['hagana', 'haagana', 'tel_aviv_darom', 'darom', 'ת"א ההגנה', 'תל אביב ההגנה', 'ת"א דרום', 'תל אביב דרום'] },

  // --- Airport / Jerusalem ---
  { code: 'natbag', nameHe: 'נתב"ג', aliases: ['natbag', 'נתב"ג'] },
  { code: 'paatei_modiin', nameHe: 'פאתי מודיעין', aliases: ["pa'atei", 'paatei', 'paatei_modiin', 'פאתי מודיעין'] },
  { code: 'modiin_merkaz', nameHe: 'מודיעין-מרכז', aliases: ["modi'in", 'modiin', 'modiin_merkaz', 'מודיעין', 'מודיעין מרכז'] },
  { code: 'navon', nameHe: 'ירושלים-יצחק נבון', aliases: ['navon', 'jerusalem', 'ירושלים יצחק נבון', 'ירושלים האומה', 'האומה'] },

  // --- Shfela / South ---
  { code: 'kfar_habad', nameHe: 'כפר חב"ד', aliases: ['kfar_habad', 'כפר חב"ד'] },
  { code: 'lod_ganei_aviv', nameHe: 'לוד-גני אביב', aliases: ['lod_ganei_aviv', 'ganei_aviv', 'לוד גני אביב'] },
  { code: 'lod', nameHe: 'לוד', aliases: ['lod', 'לוד'] },
  { code: 'ramla', nameHe: 'רמלה', aliases: ['ramla', 'רמלה'] },
  { code: 'beit_shemesh', nameHe: 'בית שמש', aliases: ['beit_shemesh', 'בית שמש'] },
  { code: 'harishonim', nameHe: 'הראשונים', aliases: ['harishonim', 'הראשונים'] },
  { code: 'beer_yaakov', nameHe: 'באר יעקב', aliases: ['beer_yaakov', 'באר יעקב'] },
  { code: 'rehovot', nameHe: 'רחובות', aliases: ['rehovot', 'רחובות'] },
  { code: 'mazkeret_batya', nameHe: 'מזכרת בתיה', aliases: ['mazkeret_batya', 'מזכרת בתיה'] },
  { code: 'yavne_mizrah', nameHe: 'יבנה-מזרח', aliases: ['yavne_mizrah', 'יבנה מזרח', 'יבנה-מזרח'] },
  { code: 'yavne_maarav', nameHe: 'יבנה-מערב', aliases: ['yavne_maarav', 'יבנה מערב', 'יבנה-מערב'] },
  { code: 'tzomet_holon', nameHe: 'צומת חולון', aliases: ['tzomet_holon', 'צומת חולון'] },
  { code: 'holon_wolfson', nameHe: 'חולון-וולפסון', aliases: ['holon_wolfson', 'wolfson', 'חולון וולפסון'] },
  { code: 'bat_yam_yoseftal', nameHe: 'בת ים-יוספטל', aliases: ['bat_yam_yoseftal', 'yoseftal', 'בת ים יוספטל'] },
  { code: 'bat_yam_komemiyut', nameHe: 'בת ים-קוממיות', aliases: ['bat_yam_komemiyut', 'komemiyut', 'בת ים קוממיות'] },
  { code: 'dayan', nameHe: 'ראשל"צ-משה דיין', aliases: ['dayan', 'moshe_dayan', 'ראשל"צ משה דיין', 'ראשון לציון משה דיין'] },
  { code: 'ashdod', nameHe: 'אשדוד', aliases: ['ashdod', 'אשדוד', 'מתחם אשדוד'] },
  { code: 'ashkelon', nameHe: 'אשקלון', aliases: ['ashkelon', 'אשקלון', 'מתחם אשקלון'] },
  { code: 'sderot', nameHe: 'שדרות', aliases: ['sderot', 'שדרות'] },
  { code: 'netivot', nameHe: 'נתיבות', aliases: ['netivot', 'נתיבות'] },
  { code: 'ofakim', nameHe: 'אופקים', aliases: ['ofakim', 'אופקים'] },
  { code: 'kiryat_malachi_yoav', nameHe: 'קריית מלאכי-יואב', aliases: ['kiryat_malachi', 'קריית מלאכי-יואב', 'קרית מלאכי'] },
  { code: 'kiryat_gat', nameHe: 'קריית גת', aliases: ['kiryat_gat', 'קריית גת', 'קרית גת'] },
  { code: 'lehavim_rahat', nameHe: 'להבים-רהט', aliases: ['lehavim', 'lehavim_rahat', 'להבים-רהט', 'להבים רהט'] },
  { code: 'beer_sheva_universita', nameHe: 'באר שבע-אוניברסיטה', aliases: ['beer_sheva_universita', 'באר שבע אוניברסיטה', 'ב"ש צפון', 'באר שבע צפון'] },
  { code: 'beer_sheva_merkaz', nameHe: 'באר שבע-מרכז', aliases: ["be'er_sheva", 'beer_sheva', 'beer_sheva_merkaz', 'באר שבע מרכז', 'ב"ש מרכז', 'באר שבע'] },
  { code: 'dimona', nameHe: 'דימונה', aliases: ['dimona', 'דימונה'] },
];

const ALIAS_INDEX = new Map<string, StationRef>();
for (const station of STATIONS) {
  for (const alias of [station.code, ...station.aliases]) {
    ALIAS_INDEX.set(normalizeAlias(alias), station);
  }
}

/** Lowercase, collapse separators, strip Hebrew punctuation, so `Kiryat-Gat` == `kiryat_gat`. */
export function normalizeAlias(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/["'׳״]/g, '')
    .replace(/[\s\-_]+/g, '_');
}

/** Resolve a shift-string or Hebrew station reference. Returns null when unknown. */
export function resolveStation(raw: string): StationRef | null {
  return ALIAS_INDEX.get(normalizeAlias(raw)) ?? null;
}

/** Every shift originates and terminates here unless the code says otherwise. */
export const DEFAULT_STATION_CODE = 'lod';

/**
 * City -> nearest station, for deriving a worker's home station from the free-text
 * `User.city` they enter at onboarding.
 *
 * Deliberately incomplete. A city that is not here resolves to null and is queued
 * for admin review rather than being guessed — a wrong home station would produce
 * confidently wrong swap advice, which is worse than no advice.
 */
export const CITY_TO_STATION: Record<string, string> = {
  'תל אביב': 'savidor',
  'תל אביב יפו': 'savidor',
  'רמת גן': 'savidor',
  גבעתיים: 'savidor',
  'רמת השרון': 'hertzliya',
  'קריית אונו': 'bnei_brak',
  'קרית אונו': 'bnei_brak',
  'אור יהודה': 'kfar_habad',
  יהוד: 'natbag',
  'נס ציונה': 'beer_yaakov',
  גדרה: 'yavne_mizrah',
  'קריית עקרון': 'mazkeret_batya',
  אלעד: 'rosh_haayin_tzafon',
  'טירת כרמל': 'atlit',
  נשר: 'haifa_merkaz',
  'קריית ביאליק': 'kiryat_motzkin',
  'קריית ים': 'kiryat_motzkin',
  'קריית אתא': 'kiryat_motzkin',
  ירושלים: 'navon',
  חיפה: 'haifa_merkaz',
  'באר שבע': 'beer_sheva_merkaz',
  לוד: 'lod',
  רמלה: 'ramla',
  אשקלון: 'ashkelon',
  אשדוד: 'ashdod',
  נתניה: 'netanya',
  רחובות: 'rehovot',
  'ראשון לציון': 'dayan',
  חולון: 'holon_wolfson',
  'בת ים': 'bat_yam_yoseftal',
  'בני ברק': 'bnei_brak',
  'פתח תקווה': 'petah_tikva_segula',
  הרצליה: 'hertzliya',
  'כפר סבא': 'kfar_saba_nordau',
  רעננה: 'raanana_darom',
  'הוד השרון': 'hod_hasharon',
  'ראש העין': 'rosh_haayin_tzafon',
  מודיעין: 'modiin_merkaz',
  'בית שמש': 'beit_shemesh',
  'קריית גת': 'kiryat_gat',
  'קרית גת': 'kiryat_gat',
  'קריית מלאכי': 'kiryat_malachi_yoav',
  'מזכרת בתיה': 'mazkeret_batya',
  'באר יעקב': 'beer_yaakov',
  יבנה: 'yavne_mizrah',
  דימונה: 'dimona',
  נהריה: 'nahariya',
  עכו: 'ako',
  כרמיאל: 'carmiel',
  'קריית מוצקין': 'kiryat_motzkin',
  'קרית מוצקין': 'kiryat_motzkin',
  'קריית חיים': 'kiryat_haim',
  בנימינה: 'binyamina',
  חדרה: 'hadera_maarav',
  עתלית: 'atlit',
  עפולה: 'afula',
  'בית שאן': 'beit_shean',
  יקנעם: 'yokneam',
  'מגדל העמק': 'migdal_haemek',
  שדרות: 'sderot',
  נתיבות: 'netivot',
  אופקים: 'ofakim',
  להבים: 'lehavim_rahat',
  רהט: 'lehavim_rahat',
  'פרדס חנה': 'caesarea_pardes_hana',
  קיסריה: 'caesarea_pardes_hana',
};

/** Resolve a free-text city to a station code, or null when we should not guess. */
export function resolveCityStation(city: string | null | undefined): string | null {
  if (!city) return null;
  const key = normalizeAlias(city);
  for (const [name, code] of Object.entries(CITY_TO_STATION)) {
    if (normalizeAlias(name) === key) return code;
  }
  // A city may also name a station outright.
  return resolveStation(city)?.code ?? null;
}
