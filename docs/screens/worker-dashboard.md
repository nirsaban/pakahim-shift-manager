# Screen: Worker dashboard ("My Shift" + Team Status)

`TakahimDashboard`, one of four role bodies inside `app/dashboard/page.tsx` (route
`/dashboard`). Server component; data fetched per-request from `x-user-id`.

## Purpose

The core "success" screen from the client interview: a פקח opens the app and immediately
sees their own shift, without digging through an Excel file. This is the screen the whole
product exists to deliver.

## Data used

`getNextShift(workerId)` → `Shift` (next `SCHEDULED`/`STARTED`, `endTime >= now`) +
resolved `replacement` (name/city/phone). `getTeamStatus(teamId)` → today's status per
team member. Both via `lib/services/shift-service.ts` / `team-service.ts` — see
`data-model.md`.

**Redesign addition:** a third data source, `getShiftsCoveringFor(workerId)` `NEW` — every
`Shift` where `replacementId === workerId`, i.e. shifts this worker agreed to cover for
someone else. Not present today because nothing ever set `replacementId` — see
`coverage-engine.md`.

## States

1. **Next shift card** (the visual anchor per `DESIGN.md`) — start/end time, and *if*
   `Shift.replacementId` is set, a replacement sub-card: name, city,
   `toWhatsAppLink(phone)` button. **Today this sub-card almost never renders** — of 490
   real shifts in production, 1 has `replacementId` set. This redesign's coverage engine
   is what makes it render for real data, not just the demo seed.
2. **No upcoming shift** — empty state, `he.dashboard.noUpcomingShifts`.
3. **"You're covering for" card** `NEW` — only shown when `getShiftsCoveringFor` returns
   rows; the reciprocal view described in `coverage-engine.md`. Absent entirely if empty
   (no empty-state clutter for something that's usually not applicable).
4. **Team status list** — every teammate + today's `ShiftStatusPill` (scheduled / started
   / completed / cancelled / holiday / sick), or empty state if the team has no shifts
   today.
5. **Report-incident entry point** — links into `report-incident.md`.
6. **Request-coverage entry point** `NEW` — a button on the next-shift card itself ("אני
   לא יכול/ה להגיע"), links into `request-coverage.md`. Only shown when there's no
   already-`PENDING` `CoverageRequest` for that shift; if one exists, shows its status
   inline instead ("ממתין לאישור ראש הצוות" / pending team-lead approval) rather than
   letting the worker file a second request.

## Actions & side effects

Read-only except the two new entry points, which navigate to their own screens
(`report-incident.md`, `request-coverage.md`) — no direct mutation happens on this screen
itself.

## Permissions

`TAKAHIM` only. Own data — no worker sees another worker's shift detail here (team status
shows names + status only, not full shift/contact detail for teammates).

## Open questions

- Should the "who I'm covering for" card also surface if the covering assignment came
  from direct team-lead assignment (not a request the worker asked for)? Assumed yes —
  the card reads `Shift.replacementId`, not `CoverageRequest`, so it's path-agnostic by
  design (see `coverage-engine.md`'s "both paths write to the same place").
