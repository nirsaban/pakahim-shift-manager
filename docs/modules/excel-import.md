# Module: Excel roster import

Fully implemented (`lib/services/upload-service.ts`, driven by `/api/uploads`, triggered
from `schedule-upload.md`). Documented here in full because this is the module whose
*absence* of replacement data is the reason `coverage-engine.md` exists — this doc is as
much about what it deliberately does not (and cannot) provide as what it does.

## Real source format (confirmed against `~/Downloads/חוברת3 (2).xlsx`, 2026-08-12)

One sheet per file, sheet name encodes the date (`DD.MM.YY`, e.g. `12.08.26`). Inside
that one sheet, multiple **region blocks** stacked vertically, each starting with its own
repeated header row:

```
מס"ד | שם הפקח | מירס | מס' עובד | שם המתלמד | מירס | מס' עובד | שעת התחלה | שעת סיום | [route] | [train-set codes] | [notes]
```

- `מס"ד` — row serial number within the block (not stored).
- `שם הפקח` — inspector's full name, single field (no separate first/last name in the source).
- `מירס` / `מס' עובד` (first pair) — the inspector's Mirs radio id and worker number.
- `שם המתלמד` / `מירס` / `מס' עובד` (second triple) — a **trainee** name + their own radio/
  worker number, when this shift is a mentor+trainee pairing. Rare: 1 of 258 rows in the
  sample file. **This is the only "second person" concept the file has, and it is not a
  replacement/coverage field** — see "What this file does not contain" below.
- `שעת התחלה` / `שעת סיום` — start/end time, inconsistently typed: plain `"HH:MM"` strings
  in some rows, Excel time-serial numbers (fractions of a day, anchored 1899-12-30) in
  others — the parser reconciles both, reading serials with UTC getters.
- Remaining columns — route description (free text, e.g. "איסוף לת"א סבידור מרכז"),
  train-set/car number codes, and a notes column (e.g. "פקח יחיד במערך כפול").

## What the importer does with each row

```
importShiftFile(file, tenantId, uploadedBy)
  1. Create a ShiftFile audit row (status: PENDING).
  2. Parse: find each region-block header row, extract+validate rows underneath it
     (importedShiftRowSchema) until the next header or end of sheet.
  3. Per region label seen: upsert a Team (auto-created if new), always assigned to the
     tenant's first TEAM_LEAD (the file has no per-region lead — see roles-permissions.md
     for the multi-team-lead consequence of this).
  4. Per worker number seen: upsert a User.
     - New worker number → create with role PAKAHIM, firstName = the full name from the
       sheet, no email/phone/city (pending self-registration — see login-onboarding.md).
     - Existing PAKAHIM worker → keep their teamId in sync with the roster; never
       overwrite name/email/city/phone (those are self-reported once registered, the
       roster shouldn't clobber them).
  5. Combine route + train-set codes + Mirs id + trainee name (if any) + reserve-list tag
     into Shift.notes as one free-text field.
  6. Replace that date's shifts for the tenant: deleteMany({tenantId, date}) then bulk
     create the freshly parsed set, in one transaction. Re-uploading the same date's file
     is expected to be idempotent (replaces, not duplicates) — verified operationally by
     stable counts across re-uploads.
  7. Update the ShiftFile row: status IMPORTED (or FAILED with errorMessage), 
     importedShiftCount.
```

## What this file does not contain (confirmed, not assumed)

Searched every cell of the real Aug-12 file for `מחליף`, `החלפה`, `מחליפה`, `תחליף`,
`כיסוי`, `מכסה` (replacement/coverage/swap-related terms in Hebrew) — **zero matches**.
The only "second person per row" concept is the trainee pairing above, which is
semantically unrelated (mentorship, not coverage) and populated on essentially no rows.

**Conclusion this redesign is built on:** replacement/coverage data cannot be sourced
from this file, ever, without the scheduling department changing what they export — which
is outside this product's control and not something to design around as if it might
appear. `coverage-engine.md`'s in-app request/assignment workflow is the actual
replacement for what a "who covers me" column would have provided.

## Consequence for the coverage engine (step 6 above)

A daily re-upload **deletes and recreates every shift for that date** — including shifts
that have an `APPROVED` `CoverageRequest` and a populated `replacementId`. Per the open
question already flagged in `data-model.md`, this needs a loud warning in
`schedule-upload.md`'s UI before a re-upload proceeds if it would wipe active coverage
assignments for that date, not a silent cascade-delete.
