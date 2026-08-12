# Screen: Request coverage `NEW`

Worker-facing half of the coverage engine. Entry point is a button on
`worker-dashboard.md`'s next-shift card; can be a modal/sheet rather than a full route
(consistent with `ReportIncidentForm` being embedded rather than standalone).

## Purpose

Directly answers what this whole redesign pass exists to fix: give a worker who can't
make their scheduled shift a real, in-app way to say so and (optionally) suggest who
covers — instead of a phone call to their team lead. See `coverage-engine.md` for the
full write path this screen triggers.

## Data used

Creates a `CoverageRequest` against the worker's own next `Shift`. Reads the worker's
`Team` roster (to populate the optional "suggest who covers" picker with same-team
`PAKAHIM` users only — per the open question in `data-model.md` about whether proposals
must be same-team). See `data-model.md`, `coverage-engine.md`.

## States

1. **Form** — reason (`SICK \| HOLIDAY \| SWAP \| OTHER`, radio/select), optional note
   (required if `OTHER`), optional "propose who covers" (searchable list of same-team
   teammates, can be left blank).
2. **Blocked — already pending** — if a `PENDING` request already exists for this shift
   (shown instead of the form, per `worker-dashboard.md`'s state 6), with a cancel action.
3. **Blocked — shift too close/started** — client-side pre-check mirroring
   `coverage-engine.md`'s server-side validation (`shift.startTime` must be in the
   future); shown as a disabled state with explanation rather than letting the user hit a
   server error.
4. **Submitting** → **Success** — confirmation that it's pending team-lead approval;
   returns to the dashboard, which now shows state 6 (pending) instead of the button.
5. **Cancel confirmation** — for state 2's cancel action; only the requester, only while
   `PENDING` (per `coverage-engine.md`'s `cancelCoverageRequest`).

## Actions & side effects

- Submit → `POST /api/coverage-requests` `NEW` → `requestCoverage(...)` (see
  `coverage-engine.md`) → notifies the team lead (see `notifications.md`).
- Cancel → `PATCH /api/coverage-requests/[id]` `NEW` with a cancel action, or a dedicated
  `DELETE` — implementation detail, either works; no notification on cancel.

## Permissions

`PAKAHIM`, and only for their own shifts (`requestedById` is always the acting user,
never settable to someone else — enforced server-side, not just hidden client-side).

## Open questions

Inherits the two open questions from `data-model.md`/`coverage-engine.md`: same-team-only
proposals, and what happens if a shift's start time passes before the team lead decides.
Both need a product answer before this ships past a demo, not just a code answer.
