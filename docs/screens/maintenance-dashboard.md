# Screen: Maintenance dashboard

`MaintenanceDashboard`, one of four role bodies in `app/dashboard/page.tsx`. Thin today —
given a proper doc per "every screen," but the redesign makes no functional changes here.

## Purpose

The מחלקת אחזקה (maintenance department) desk for train-equipment fault reports —
new as of the client interview's q7 routing requirement (`Incident.route = MAINTENANCE`).

## Data used

`listIncidentsForUser(userId)` filtered to incidents where this `MAINTENANCE`-role user
is a recipient (i.e. `route = MAINTENANCE` or `EMERGENCY_BROADCAST`). See
`data-model.md`, `report-incident.md`.

## States

1. **Open incidents list** — same `IncidentActions` acknowledge/resolve pattern as
   `team-lead-dashboard.md`'s incident section (any recipient can act, not just the
   original team lead).
2. **Empty state** — no open equipment incidents.

## Actions & side effects

Acknowledge/resolve → `PATCH /api/notifications/incidents/[id]` — identical mechanism to
the team-lead dashboard, no maintenance-specific logic.

## Permissions

`MAINTENANCE` role only.

## Open questions

None — this screen is intentionally minimal and this redesign doesn't add scope here.
Worth noting for completeness: `MAINTENANCE` users have no coverage-related visibility at
all (not a gap, since equipment faults and shift coverage are unrelated concerns for this
role).
