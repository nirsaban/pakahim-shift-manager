# Overview — Takahim Shift Manager redesign docs

One markdown file per screen and per cross-cutting module, written 2026-08-12 after
discovering that `SPEC.md` §3.2's claim — "who replaces them / who they're replacing:
already built" — was false. See `data-model.md`'s intro and `modules/coverage-engine.md`
for the full story: `Shift.replacementId` was never populated by anything, because the
real Excel roster file has no coverage/replacement data and no screen ever wrote to it.
This doc set exists to design that workflow for real, and to give every other screen
(existing and previously-unbuilt) the same from-scratch treatment.

## How this doc set relates to what already exists

- **`SPEC.md`** (repo root) — the prior product spec grounded in the 2026-08-10 client
  discovery interview. Still accurate for scope/roles/terminology-resolution (§1, §2, §4)
  — not superseded. **§3.2 specifically is superseded** by `screens/request-coverage.md`
  + `screens/coverage-approvals.md` + `modules/coverage-engine.md` in this folder.
- **`DESIGN.md`** (repo root) — the visual design system (tokens, component primitives,
  layout conventions). Unrelated to the data-model gap this redesign addresses; every
  screen doc here assumes `DESIGN.md`'s conventions apply unchanged (same `Card`/
  `Button`/`StatusPill`/`EmptyState` primitives, same RTL logical-property rules).
- **`CLAUDE.md`** (repo root) — project-level source of truth for stack, conventions, and
  the running log of client-discovery findings. This doc set doesn't change any of
  `CLAUDE.md`'s Non-Negotiable Conventions; every new screen/route designed here follows
  them (RTL Hebrew via `lib/he.ts`, Redis session liveness, Zod validation at boundaries).

## Roles (unchanged — see `modules/roles-permissions.md` for full detail)

`TAKAHIM` (פקח) · `TEAM_LEAD` (ראש צוות) · `SHIBUTZ` (משבץ) · `ADMIN` · `SUPER_ADMIN` ·
`MAINTENANCE` (מחלקת אחזקה)

## Doc index

**Data & business logic**
- [`data-model.md`](./data-model.md) — every entity, including the new `CoverageRequest`
  and the `Shift.replacementId` fix
- [`modules/coverage-engine.md`](./modules/coverage-engine.md) — the core fix: how
  replacement actually gets decided and recorded
- [`modules/roles-permissions.md`](./modules/roles-permissions.md)
- [`modules/auth-sessions.md`](./modules/auth-sessions.md)
- [`modules/notifications.md`](./modules/notifications.md)
- [`modules/excel-import.md`](./modules/excel-import.md) — includes the confirmed proof
  that the source file has no replacement data

**Worker-facing screens**
- [`screens/login-onboarding.md`](./screens/login-onboarding.md)
- [`screens/worker-dashboard.md`](./screens/worker-dashboard.md)
- [`screens/report-incident.md`](./screens/report-incident.md)
- [`screens/request-coverage.md`](./screens/request-coverage.md) — NEW

**Team lead screens**
- [`screens/team-lead-dashboard.md`](./screens/team-lead-dashboard.md)
- [`screens/coverage-approvals.md`](./screens/coverage-approvals.md) — NEW

**Scheduler/admin screens**
- [`screens/schedule-upload.md`](./screens/schedule-upload.md)
- [`screens/manage-teams-workers.md`](./screens/manage-teams-workers.md) — NEW
- [`screens/admin-dashboard-analytics.md`](./screens/admin-dashboard-analytics.md) — NEW

**Maintenance**
- [`screens/maintenance-dashboard.md`](./screens/maintenance-dashboard.md)

## Every open question, in one place

Pulled from each doc's "Open questions" section, so a client conversation can work
through them as one list rather than hunting file by file:

1. Can a worker propose *any* teammate as a coverage replacement, or only same-team?
   (`data-model.md`, `screens/request-coverage.md`)
2. What happens to a pending coverage request if the shift starts before a decision is
   made — auto-expire, and does that need new scheduler/cron infrastructure that doesn't
   exist today? (`data-model.md`, `modules/coverage-engine.md`)
3. Does re-uploading a day's roster silently wiping approved coverage assignments need to
   be blocked outright, or just warned-and-allowed? (`data-model.md`,
   `modules/excel-import.md`, `screens/schedule-upload.md`)
4. Should coverage decisions also get a WhatsApp deep-link fallback like incident reports
   do? (`modules/notifications.md`)
5. Is "פטיש" a distinct approval role, or genuinely the same as team lead? Still open from
   `SPEC.md`'s original conflict list — this redesign works either way (both `TEAM_LEAD`
   and `SHIBUTZ`/`ADMIN` get approval authority) but the real answer would tighten the
   permission model. (`modules/roles-permissions.md`, `screens/coverage-approvals.md`)
6. How does role reassignment interact with `Team.teamLeadId` when demoting a team lead
   who still leads a team? (`screens/manage-teams-workers.md`)
7. Direct-assign/override replacement picks need overlap detection (can't assign someone
   already working) — new query logic, not present anywhere today.
   (`screens/coverage-approvals.md`)
8. Live-computed vs. snapshot-table analytics for coverage-rate/incident trends, depending
   on data volume this pass has no visibility into. (`screens/admin-dashboard-analytics.md`)
9. No recovery path for a genuinely new worker who hasn't appeared in any roster upload
   yet — login is entirely gated on the Excel import having created their row first.
   (`screens/login-onboarding.md`)

## What this doc set is not

Not a migration, not new code, not a sprint plan. It's the design that should exist
before any of `CoverageRequest`, the two new screens, or the two new admin screens get
built — so implementation starts from an agreed shape instead of guessing mid-build, the
same mistake that let `SPEC.md` §3.2 go unverified for this long.
