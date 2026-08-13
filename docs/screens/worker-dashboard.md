# Screen: Worker dashboard ("My Shift" + Team Status)

`PakahimDashboard`, one of four role bodies inside `app/dashboard/page.tsx` (route
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

7. **"All my shifts" list** `NEW` (`MySchedule`) — every shift the worker holds in the
   next 14 days, grouped by day, today/tomorrow named rather than dated. Each row shows
   times, duration, the parsed start→end stations, `מס״ד`, region and route note, plus who
   is covering it if anyone is. SICK/HOLIDAY days stay in the list so the worker can
   confirm a cover was assigned. Fed by `getWorkerSchedule(workerId, {from, to})`.
   This is the direct payoff of multi-day upload: the whole week is visible the moment
   scheduling uploads it, which is what the client asked for in the interview.
8. **Workload card** `NEW` (`WorkloadCard`) — shifts, total/average/longest hours, night
   shifts, weekend shifts, days worked, longest consecutive run, absences, over a −14/+14
   day window. Plus a comparison against the teammate average, because an hour count means
   nothing on its own. Rest gaps under the legal 8 hours are listed separately as warnings
   rather than folded into the grid — every other number is informational, that one is a
   roster error. Metrics computed by the pure `lib/roster/workload.ts`
   (`computeWorkload` / `compareToTeam`), fed by `lib/services/workload-service.ts`.

Both are also available as JSON at `GET /api/shifts/mine?daysBack=&daysForward=` for the
PWA. That route is scoped to the caller and takes no `workerId`, so it cannot become a way
for one inspector to read another's roster.

## Actions & side effects

Read-only except the two new entry points, which navigate to their own screens
(`report-incident.md`, `request-coverage.md`) — no direct mutation happens on this screen
itself.

## Permissions

`PAKAHIM` only. Own data — no worker sees another worker's shift detail here (team status
shows names + status only, not full shift/contact detail for teammates).

## Open questions

- Should the "who I'm covering for" card also surface if the covering assignment came
  from direct team-lead assignment (not a request the worker asked for)? Assumed yes —
  the card reads `Shift.replacementId`, not `CoverageRequest`, so it's path-agnostic by
  design (see `coverage-engine.md`'s "both paths write to the same place").
