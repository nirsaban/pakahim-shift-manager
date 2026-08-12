# Roster engine — shift strings, handoffs, swap suggestions

Parses the shift-string column of the daily roster, derives who hands which train to whom, and proposes swaps that cut dead-head travel.

Additive: the existing auth, coverage-approval and incident flows are untouched. The engine only ever produces *proposals* — `lib/services/coverage-service.ts` remains the sole writer of `Shift.replacementId`.

## Layout

| Path | Role |
| --- | --- |
| `lib/reference/stations.ts` | 67 stations, aliases, city→station map |
| `lib/reference/lines.ts` | 17 line ranges + ordered stops; `resolveLine()`, `stopDistance()` |
| `lib/roster/sheet.ts` | worksheet → `RosterRowInput[]`; date/time parsing, section names |
| `lib/roster/tokenize.ts` | shift string → tokens |
| `lib/roster/route-note.ts` | Hebrew column-9 note → start/end stations |
| `lib/roster/legs.ts` | tokens → legs with endpoints |
| `lib/roster/duty.ts` | orchestration + `templateHash` |
| `lib/roster/handoff.ts` | handoff detection + dead-head crossing signature |
| `lib/roster/travel.ts` | stop-distance travel estimator (BFS over the line graph) |
| `lib/roster/swaps.ts` | swap scoring |
| `lib/services/roster-service.ts` | persistence (duties, legs, handoffs, suggestions) |
| `lib/services/swap-service.ts` | listing, dismiss, and the bridge to `CoverageRequest` |
| `lib/services/station-service.ts` | city→home-station resolution + unresolved-alias queue |

**Everything under `lib/roster/` and `lib/reference/` is pure** — no Prisma, no `he.ts`, no Next runtime. That is what lets `scripts/verify-roster.ts` exercise the whole grammar against the real files with no database.

## The grammar

Tokens are separated by `-`, which the roster *also* uses inside several tokens. Three lookahead rules handle that, and their order matters:

1. `otem-(508-511)` before bare digits, else `511)` is unknown.
2. `nikayon-kibui` before the single-segment ops, else `kibui` is consumed alone.
3. `<train>-bt` before bare digits — otherwise the detached form in row 160 scores `139` as active duty and emits a phantom handoff.

`BT` (non-duty passenger transit) has **three spellings**: `242bt`, `bt230`, and detached `139-bt`. Also handled: `taxi_<station>_<HH:MM>`, `bdika_<set>`, `muchan_*`, `konan[_place][_partOfDay]`, `ptihat_set`/`neilat_set`, `blima`, `ituk`.

Unknown tokens are classified `UNKNOWN` and recorded — never thrown. A grammar surprise degrades one duty, it does not fail the import.

## Station endpoints

Precedence for a duty's start/end, recorded per leg as `StationSource`:

1. `ROUTE_NOTE` — the Hebrew column-9 note (`איסוף ל<X>` / `פיזור מ<X>` / `איסוף ופיזור מ/אל <X>`). Present on 159 of 255 rows, 65 distinct values, all covered.
2. `EXPLICIT_TOKEN` — a station token in the shift string.
3. `DEFAULT_LOD` — the "every shift starts and ends at Lod" convention. **Only ever fills the final movement leg.**

An interior train→train transfer with no station token is `INFERRED_TRANSFER` with a **null** station. Filling Lod there would invent a location and silently corrupt every distance calculation.

A duty **ends at its last active leg**, not at the end of the string: in `2107-152-109-hagana-409bt` the duty ends at `hagana` and `409bt` is the ride home. The gap between `endStation` and `finalStation` is the dead-head the swap engine prices.

## Transport mode — how the inspector gets there

`איסוף ל<X>` / `פיזור מ<X>` do not merely name a station: they mean a **taxi** collects the inspector from home to X, or drives them home from X. That is railway-paid door-to-door transport, and it *substitutes* for riding a service train.

The data bears this out exactly. On 13.08.26:

| End of shift | TAXI (note) | RAIL (`bt` leg) | neither |
| --- | --- | --- | --- |
| start | 99 | 56 | 100 |
| end | 94 | 57 | 104 |

**Of the 99 rows with an איסוף note, zero begin with a `bt` leg.** They are alternatives, not variants. `324-333-340-2637` ("איסוף לראשל"צ משה דיין ופיזור מאשקלון") has no `bt` at all precisely because a taxi does both ends.

`Duty.startTransport` / `Duty.endTransport` record which it is, and scoring keeps the two apart:

- **RAIL** minutes are the inspector's own unpaid travel — what the flagship swap actually eliminates.
- **TAXI** minutes are a railway cost that shortens or lengthens with whoever is assigned.

`dutyCostBreakdown()` returns both, `ROSTER_TAXI_WEIGHT` (default 1) sets their relative weight, and the dashboard reports `חיסכון בנסיעת סרק של הפקח` separately from `חיסכון בהסעות (מוניות)` so a scheduler sees which cost is being cut.

In the 4 of 94 rows that state both, the note wins — it is the scheduler's explicit word.

## Handoff rule

`predecessor.lastActiveTrain === successor.firstActiveTrain`, same matching block, and `|successor.start − predecessor.end| ≤ 90 min` (wrap-around aware, `ROSTER_HANDOFF_WINDOW_MINUTES`).

**משני forms its own matching block** rather than being dropped. They are a מערך כפול double crew, so a משני line and a primary line routinely end on the same train at the same minute. Letting them compete for one successor produces genuine ambiguity (16 ambiguous successors measured); separate blocks give 89 handoffs with zero ambiguity and preserve the reinforcement crew's own chain.

Window sweep on 13.08.26: 45→45, 60→46, **90→89**, 120→89, 180→90.

## Swap scoring

One exchange formula:

```
cost(duty, home) = travel(home → duty.start) + travel(duty.end → home)
saved = [cost(A,homeA) + cost(B,homeB)] − [cost(B,homeA) + cost(A,homeB)]
```

`travel()` returns **null**, never 0, when an endpoint is unknown — a 0 would make every unknown station look like a perfect swap. Uncertain lines are excluded from the graph entirely.

Two candidate sources:

- **`ABSORB_HANDOFF`** — handoffs flagged `bothSidesDeadhead`: the predecessor leaves a station as a passenger at the same minute the successor arrives into it as one. **43 of 89** handoffs on the real roster, and the exit station matched the entry station in all 43. Emitted with *no home-station data*, which is what makes the feature useful before onboarding fills it in.
- **`SWAP_DUTIES`** — any same-section, same-reinforcement-class pair where both homes are known and `saved ≥ 30 min`.

## Conversion into the existing coverage flow

`convertSwapSuggestion(id, side, actingUserId)` calls the existing `requestCoverage()` with `reason: 'SWAP'` — the enum value already existed for this. That inherits its guards (shift already started, request already pending, invalid proposed replacement) and the team-lead email, and the lead approves through the untouched existing UI.

## Import integration

`importShiftFile` gained one block after its transaction:

```ts
const duties = roster.rows.map((r) => parseDuty(r));
await persistRoster({ tenantId, date, duties, shiftIdByKey });
```

wrapped in try/catch. **A roster-layer failure never fails the import** — it degrades to "no handoffs today" and records `rosterError`. The destructive-replace semantics and the 409 coverage-confirmation guard are unchanged.

Rows without an inspector are no longer discarded: ~13 a day carry a real shift string with nobody assigned, and they are kept as open duties.

## Commands

```bash
npm run db:seed:reference       # stations, lines, city map (idempotent)
npm run verify:roster           # 32 golden checks against the real files
npm test                        # 45 unit tests, no DB
npm run roster:import -- <xlsx> # import a file straight into the dev DB
npm run roster:backfill-homes   # derive home stations from existing cities
```

## Known gaps

See `docs/reference/README.md` — trains 840–881 (inferred line, excluded from scoring), the four-digit service-move prefix, and `חדרה מזרח`. All flagged `uncertain`, none silently guessed.
