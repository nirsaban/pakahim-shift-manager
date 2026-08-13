# Screen: Team lead dashboard

`TeamLeadDashboard`, one of four role bodies in `app/dashboard/page.tsx`. Unchanged
structurally by this redesign except for one new section — see below.

## Purpose

The team lead's at-a-glance view: who's working, who reported what, and (new) who needs
a coverage decision. Directly serves the client's description of the team lead as first
stop for sick/leave requests and incident reports.

## Data used

`getTeamsLedBy(userId)` (plural — a lead may lead multiple `Team`s, see
`roles-permissions.md`) feeds `getUpcomingRoster(teamId[])`, `getTeamStatus(teamId[])`,
and `listIncidentsForUser(userId)`. **New:** `listPendingCoverageRequests(teamId[])`
`NEW` — see `coverage-engine.md`.

## States

1. **Upcoming roster** — next 10 shifts across every led team, "next up" badge on the
   first entry, worker + time + city + team name.
2. **Team status** — today's status per member, across every led team.
3. **Incidents** — list of incidents where this lead is a recipient, with
   acknowledge/resolve actions (`IncidentActions` component) — any recipient can act, not
   just the incident's own `teamLeadId`.
4. **Pending coverage requests** `NEW` — count/summary card linking into
   `coverage-approvals.md`; a lead who leads multiple teams sees pending requests across
   all of them, same plural-teamId pattern as every other section here.
5. **Team workload** `NEW` (`TeamWorkloadCard`) — one row per `PAKAHIM` across every led
   team over a −14/+14 day window, sorted heaviest first: shift count, total hours, night
   shifts, and a warning badge counting rest gaps under the legal 8 hours. Members with no
   shifts stay in the list rather than being filtered out — an empty row is the most
   actionable one there is when balancing a roster. Same `computeWorkload` used by the
   worker's own card (`worker-dashboard.md` state 8), so the two can never disagree.
6. **Empty states** for each section independently (a lead with no pending incidents but
   3 pending coverage requests sees exactly that, not a blanket "nothing to do").

## Actions & side effects

Incident acknowledge/resolve — existing, unchanged (`PATCH
/api/notifications/incidents/[id]`). Coverage requests are *not* decided inline on this
screen — the summary card links to the dedicated `coverage-approvals.md` screen, which
needs more room (proposed replacement, roster picker for override) than a dashboard card
can hold well.

## Permissions

`TEAM_LEAD` only, scoped to every team they lead (never just the first one — see the
multi-team-lead gotcha in `roles-permissions.md`).

## Open questions

None beyond what's already flagged in `coverage-engine.md`/`data-model.md` — this screen
is mostly a read-only summary, the real design decisions live in `coverage-approvals.md`.
