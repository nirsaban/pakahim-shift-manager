# Reference material

## `lines-and-patrols-25.12.25.pdf`

The official Israel Railways inspectors' booklet **"קווים וסיורים"** (אגף פקחים), 18 pages, image-only — there is no text layer, so it must be read as rendered pages:

```bash
pdftoppm -png -r 40 docs/reference/lines-and-patrols-25.12.25.pdf /tmp/pg
```

| Page | Content |
| --- | --- |
| 1 | Intro: what a patrol segment is, the six duties of a סיור נראות, the ברק כחול night rule |
| 2 | **Index of 16 train-number ranges → routes.** The decoder for every number in a shift string |
| 3–18 | One strip-map per range: the ordered station sequence, with patrol segments boxed in red/blue/green |

Page 1 documents mid-journey handoff as official procedure, which is the operational basis for the whole handoff engine:

> בעת החלפת פקחים במהלך הנסיעה, על הפקח המחליף לבצע סיור נראות מיד לאחר ההחלפה (ללא קשר למקטעי הסיור המסומנים).

### What was transcribed from it

- `lib/reference/lines.ts` — the 16 ranges and each line's ordered stops.
- `lib/reference/stations.ts` — every station named across pages 3–18, with the latin transliterations used in shift strings.

Where page 2's index and a detail page disagree on bounds (`19-59` vs `19-58`, `60-99` vs `59-99`, `700-710` vs `701-710`), **the detail page wins** — except that 700 is kept inside the night-train range because roster codes use it.

### Known gaps — confirm with the client

1. **Trains 840–881 are used in the rosters but appear in no documented range.** The booklet jumps 830-839 → 900-949. Their route notes always name ראש העין צפון and חדרה מזרח, so `lines.ts` carries an inferred `rosh_haayin_hadera_mizrah` line marked `uncertain: true`. Uncertain lines resolve for labelling but `stopDistance()` refuses to score on them, so this cannot silently corrupt a swap recommendation.
2. **Four-digit train numbers are undocumented.** 118 of 124 strip their leading digit into a valid range (`2101`→`101`, prefix `2` covers 96 of them). `resolveLine()` does exactly that and flags the leg `isServiceMove`. One roster note corroborates the reading — *"מפעיל את 985 כמערך ריק מרחובות לאשדוד"* — but the semantic label is unconfirmed.
3. **`חדרה מזרח` is not in the booklet** yet is referenced by route notes; seeded as `uncertain`.

## `fixtures/rosters/` (gitignored)

The real daily rosters. **They contain inspector names, worker numbers, Mirs radio IDs and personal phone numbers**, so `/fixtures/rosters/*` is gitignored. `npm run verify:roster` expects `13.08.26.xlsx` and `12.08.26.xlsx` there; override with `ROSTER_FIXTURE_DIR`.

CI runs `npm test` (pure unit tests, no fixtures) but **not** `verify:roster`.
