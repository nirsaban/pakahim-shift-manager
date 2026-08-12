// Types for the roster shift-string parser.
//
// Everything under lib/roster/ is PURE: no prisma, no he.ts, no Next runtime.
// That is what lets scripts/verify-roster.ts run the whole grammar against the
// real Excel files without a database.

/**
 * A token owns 1..3 source segments, because the roster reuses "-" both as the
 * token separator and inside multi-part tokens (`nikayon-kibui`,
 * `otem-(508-511)`, the detached `139-bt`). Keeping the raw segments means
 * nothing is lost when we persist.
 */
export type Token =
  | { kind: 'TRAIN'; train: string; raw: string[] }
  | { kind: 'TRANSIT'; train: string; form: 'suffix' | 'prefix' | 'detached'; raw: string[] }
  | { kind: 'STATION'; stationKey: string; raw: string[] }
  | { kind: 'STANDBY'; code: string; stationKey: string | null; partOfDay: PartOfDay | null; raw: string[] }
  | { kind: 'OPS'; code: OpCode; operands: string[]; raw: string[] }
  | { kind: 'TAXI'; stationKey: string; minutes: number; raw: string[] }
  | { kind: 'INSPECTION'; setNumber: string; raw: string[] }
  | { kind: 'UNKNOWN'; text: string; raw: string[] };

export type PartOfDay = 'boker' | 'mitcham' | 'tzaharaim' | 'erev' | 'niyud';

export type OpCode =
  | 'ptihat_set'
  | 'neilat_set'
  | 'blima'
  | 'ituk'
  | 'nikayon'
  | 'kibui'
  | 'nikayon_kibui'
  | 'otem'
  | 'bdika';

export type WarningCode =
  | 'EMPTY_SEGMENT'
  | 'TRAILING_PROSE'
  | 'OTEM_OPERANDS_MISSING'
  | 'UNKNOWN_TOKEN'
  | 'UNRESOLVED_STATION'
  | 'EMPTY_SHIFT_STRING';

export interface ParseWarning {
  code: WarningCode;
  detail?: string;
  index?: number;
}

export interface TokenizeResult {
  tokens: Token[];
  warnings: ParseWarning[];
  /** Hebrew prose found trailing the code, stripped before tokenizing. */
  trailingNote: string | null;
}

/** Where a leg endpoint came from. Drives scoring confidence — an endpoint we
 *  assumed from the Lod convention must not outrank one stated in a route note. */
export type StationSource =
  | 'EXPLICIT_TOKEN'
  | 'ROUTE_NOTE'
  | 'DEFAULT_LOD'
  | 'INFERRED_TRANSFER'
  | 'UNKNOWN';

export type LegKind =
  | 'TRAIN'
  | 'TRANSIT'
  | 'STANDBY'
  | 'OPS'
  | 'TAXI'
  | 'INSPECTION'
  | 'UNKNOWN';

export interface ParsedLeg {
  seq: number;
  kind: LegKind;
  /** false for TRANSIT (bt) and TAXI — the dead-head flag the product turns on. */
  isDuty: boolean;
  rawTokens: string[];
  trainNumber: string | null;
  lineCode: string | null;
  isServiceMove: boolean;
  opCode: OpCode | null;
  opOperands: string[];
  atMinutes: number | null;
  fromStation: string | null;
  fromSource: StationSource;
  toStation: string | null;
  toSource: StationSource;
}

export interface ParsedRouteNote {
  /** "איסוף ל<X>" — where the inspector is collected to, i.e. duty start. */
  pickupTo: string | null;
  /** "פיזור מ<X>" — where the inspector is dispersed from, i.e. duty end. */
  dispersalFrom: string | null;
  pickupStation: string | null;
  dispersalStation: string | null;
  raw: string;
}

export type ParseStatus = 'OK' | 'PARTIAL' | 'FAILED';

/**
 * How the inspector gets to the start of the shift / home from the end of it.
 *
 * These are alternatives, not variations: the roster uses a `bt` leg OR an
 * איסוף/פיזור note, never both at the same end. Measured on 13.08.26 — of the 99
 * rows with an איסוף note, ZERO begin with a `bt` leg, while 56 of the 156 rows
 * without one do.
 *
 *  TAXI  — "איסוף ל<X>" / "פיזור מ<X>": a taxi collects the inspector from home
 *          to X, or drives them home from X. Door to door, paid by the railway.
 *  RAIL  — a `bt` leg: the inspector rides a service train as a passenger. This
 *          is the inspector's own unpaid travel time, and it is what a swap can
 *          actually eliminate.
 *  NONE  — neither stated; the shift is assumed to begin and end at Lod.
 */
export type TransportMode = 'TAXI' | 'RAIL' | 'NONE';

export interface RosterRowInput {
  rowIndex: number;
  section: string;
  serial: string;
  name: string;
  workerNumber: string;
  mirs: string;
  traineeName: string;
  startMinutes: number | null;
  endMinutes: number | null;
  routeNote: string;
  shiftString: string;
  remarks: string;
}

export interface ParsedDuty {
  rowIndex: number;
  section: string;
  serial: string;
  /** משני — reinforcement crew on a double (DDEMU) set. */
  isReinforcement: boolean;
  name: string;
  workerNumber: string;
  startMinutes: number | null;
  endMinutes: number | null;
  shiftString: string;
  routeNote: ParsedRouteNote | null;
  remarks: string;
  legs: ParsedLeg[];
  tokens: Token[];
  /** First / last leg with isDuty === true. BT legs are excluded by construction. */
  firstActiveTrain: string | null;
  lastActiveTrain: string | null;
  /** End of the last ACTIVE leg — NOT the end of a trailing BT ride home. */
  startStation: string | null;
  startSource: StationSource;
  endStation: string | null;
  endSource: StationSource;
  /** Where the whole string ends, BT included. The gap to endStation is the dead-head. */
  finalStation: string | null;
  /** How the inspector reaches the start of the shift, and leaves the end of it. */
  startTransport: TransportMode;
  endTransport: TransportMode;
  templateHash: string;
  parseStatus: ParseStatus;
  warnings: ParseWarning[];
  trailingNote: string | null;
}
