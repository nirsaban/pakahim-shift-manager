# Screen: Report incident

`ReportIncidentForm` (`app/dashboard/_components/ReportIncidentForm.tsx`), embedded in
the worker dashboard rather than a standalone route. Unchanged by this redesign — documented
for completeness per "every screen gets its own doc."

## Purpose

Matches the client interview verbatim (q7): a regular fault goes to the team lead; a
train-equipment fault also goes to מחלקת אחזקה; an emergency fans out to everyone
relevant at once — "נוהל אירועים אחד."

## Data used

`Incident` + `IncidentRecipient` fan-out — see `data-model.md`. `createIncident` (
`lib/services/incident-service.ts`) computes the recipient list from `route`.

## States

1. **Form** — title, description, `severity` (low/normal/high/critical, default normal),
   `route` (team lead / maintenance / emergency, default team lead).
2. **Submitting** — disabled state, per `DESIGN.md` button conventions.
3. **Success** — confirmation, plus a `wa.me` link to the team lead as a faster
   fallback touchpoint (per `notifications.md`'s WhatsApp-deep-link pattern).
4. **Error** — inline, generic server-error copy on failure.

## Actions & side effects

Submit → `POST /api/notifications/incidents` → creates `Incident` + fan-out
`IncidentRecipient` rows → best-effort emails every recipient with an address (never
blocks/fails the report on a mail-send failure — see `notifications.md`).

## Permissions

`PAKAHIM` (the reporter). Recipients (team lead, and `MAINTENANCE`/`ADMIN` users
depending on route) act on it via `team-lead-dashboard.md` / `maintenance-dashboard.md`.

## Relationship to coverage requests `NEW`

Deliberately kept separate from `request-coverage.md` rather than merged into one form,
even though both are "worker tells the team lead something's wrong with my shift." An
incident is about *right now* (something broke, needs attention today); a coverage
request is about *a specific future shift* (needs a decision before it starts, is
either approved or rejected, and has a concrete data effect — `Shift.replacementId`).
Conflating them would mean either overloading `Incident.route` with values that don't fit
its fan-out model, or losing the approve/reject state machine `coverage-engine.md`
needs. Flagged as a deliberate split, not an oversight.

## Open questions

None new from this redesign — this screen's design is unchanged.
