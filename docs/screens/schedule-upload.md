# Screen: Schedule upload

`app/admin/upload/page.tsx` — route `/admin/upload`.

## Purpose

How the daily roster Excel gets into the system. Client's actual ask is zero-click sync
the moment scheduling emails the file (~12:30–13:00 daily) — explicitly deferred
(`SPEC.md` conflict #4, needs an infra decision: inbox polling vs. watched folder). This
screen is the manual stand-in, deliberately built so swapping the trigger later doesn't
require a redesign.

## Data used

`ShiftFile` (audit row), full `importShiftFile` write path — see `excel-import.md` for
complete detail on what gets parsed and written.

## States

1. **Picker** — drag-and-drop or click-to-browse, `.xlsx`/`.xls` only.
2. **Uploading**.
3. **Success** — imported shift count + a skipped-rows note if any rows failed
   validation.
4. **Error** — `errorMessage` from a `FAILED` `ShiftFile`.
5. **Upload history** — past uploads list (`getUploadHistory`), also visible from
   `admin-dashboard-analytics.md`'s shortcut.
6. **Coverage-wipe warning** `NEW` — per the open question flagged in `excel-import.md`
   and `data-model.md`: before a re-upload replaces a date's shifts, check whether any of
   that date's shifts have an `APPROVED` `CoverageRequest`/populated `replacementId`, and
   if so show an explicit warning ("this will remove N active coverage assignments") 
   before letting the upload proceed — not a silent cascade-delete.
   **Multi-day:** the 409 body carries `coverageByDate`, and the warning lists each
   affected day by name — a weekly file can wipe coverage on days the admin never
   considered, so one aggregate number would understate what they are agreeing to.
7. **Per-day import summary** `NEW` — success renders `ImportResult.days`: one row per
   roster date, with its imported and skipped counts. A single-day file shows one row, so
   there is no separate UI mode. This is how an admin confirms every day they expected
   actually landed.

## Actions & side effects

Submit → `POST /api/uploads` → `importShiftFile` (see `excel-import.md`) → replaces the
shifts of **every date the workbook carries** (one for a daily file, several for a weekly
one — see `excel-import.md`'s "Multi-day workbooks").

## Permissions

`SHIBUTZ`/`ADMIN`/`SUPER_ADMIN` — enforced server-side via `x-user-role`; the UI itself
has no role gate (relies on the route being unreachable without navigating there, plus
the API rejecting unauthorized roles).

## Open questions

State 6 above is the one real addition this redesign makes to this screen — everything
else is unchanged. The exact UX of the warning (block entirely vs. warn-and-allow) isn't
decided; blocking entirely is safer but means a genuine schedule correction can't happen
without first manually clearing affected coverage assignments, which may be too rigid.
Flagged for a product decision, not resolved here.
