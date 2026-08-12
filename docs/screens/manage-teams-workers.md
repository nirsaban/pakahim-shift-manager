# Screen: Manage teams & workers `NEW`

No route exists today. `lib/he.ts`'s `admin` section already has unused copy stubs —
`manageTeams`, `manageWorkers`, `addTeam`, `addWorker`, `teamName`, `teamLead` — designed
here for the first time.

## Purpose

Today, `Team` and `User` rows are entirely a byproduct of Excel imports
(`excel-import.md`) — there is no direct way for an admin to create a team, fix a
mis-assigned team lead, merge two region-labels that turned out to be the same team, or
manually add/edit a worker outside the import cycle. This screen is the admin escape
hatch for all of that.

## Data used

`Team` (list/create/edit — name, `teamLeadId`), `User` (list/filter by role or team,
edit role/team/contact info, in exceptional cases create manually). See `data-model.md`.

## States

1. **Teams list** — every `Team`, member count, team lead name. Edit → change name or
   reassign `teamLeadId` (must be an existing `TEAM_LEAD`-role user, or promote a
   `TAKAHIM` user to `TEAM_LEAD` inline).
2. **Add team** — manual creation for cases the importer wouldn't produce (e.g. a brand
   new region before any roster file mentions it).
3. **Workers list** — searchable/filterable by role, team, or "no email yet" (surfaces
   exactly the workers stuck in `login-onboarding.md`'s registration gate — useful for an
   admin following up on adoption).
4. **Worker detail/edit** — role change (e.g. promote to `TEAM_LEAD`/`MAINTENANCE`), team
   reassignment, contact info correction. **Guardrail:** changing a worker's `role` away
   from `TEAM_LEAD` while they still lead one or more `Team`s needs to either block the
   change or force reassigning those teams first — the schema has no cascade/validation
   for this today (`Team.teamLeadId` isn't nullable), so an unguarded role change could
   leave a team with a lead who's no longer a `TEAM_LEAD`.
5. **Add worker** — manual creation outside the import cycle (e.g. onboarding someone
   before their first roster appearance).

## Actions & side effects

Standard CRUD via new `/api/teams` and `/api/users` (admin-only) routes — not designed in
route-by-route detail here since the pattern matches existing CRUD conventions in the
codebase (Zod validation at the boundary, tenant-scoped Prisma calls).

## Permissions

`ADMIN`/`SUPER_ADMIN` only — not `SHIBUTZ` (schedulers upload rosters and manage
coverage per `roles-permissions.md`, but don't manage the org chart itself).

## Open questions

- Should this screen let an admin manually set `Shift.replacementId` too (a third write
  path alongside `coverage-engine.md`'s two)? Leaning no — that's what
  `coverage-approvals.md`'s direct-assign panel is for, and duplicating it here would
  fragment where "who covers this shift" gets decided. Flagged as a scope boundary to
  hold, not an oversight.
- No design yet for bulk operations (e.g. reassigning many workers to a new team at once
  after a reorg) — deferred as a v2 concern, not blocking the core CRUD this screen needs
  to exist at all.
