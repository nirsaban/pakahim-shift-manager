# Screen: Admin dashboard & analytics

`AdminDashboard`, one of four role bodies in `app/dashboard/page.tsx` today (currently
just an upload shortcut + upload history — see `excel-import.md`). The analytics half is
`NEW` — `CLAUDE.md`'s Admin feature list calls for "View analytics: coverage, incident
reports" but nothing beyond upload history exists today.

## Purpose

The admin's operational overview: is the roster actually covering every shift, are
incidents piling up unresolved, is adoption (self-registration) happening. This is where
"coverage" as a *metric* lives, distinct from `coverage-approvals.md` where coverage as a
*workflow* happens.

## Data used

Existing: `getUploadHistory(tenantId)`. New, tenant-wide aggregate queries `NEW`:
- Shift coverage rate: `% of today's/this week's SICK|HOLIDAY-status shifts that have a
  populated replacementId` — the single number that most directly answers "is the
  coverage problem actually solved," a natural KPI for this exact redesign.
- Incident counts by status/severity/route, open-vs-resolved trend.
- Registration completion: `% of PAKAHIM users with email set` (i.e. who've completed
  `login-onboarding.md`) — directly surfaces the 243-of-246 real-worker gap found in this
  session's production data.
- Pending coverage requests count, tenant-wide (a rollup of what
  `team-lead-dashboard.md` shows per-lead).

## States

1. **Upload shortcut + history** — unchanged from today.
2. **Coverage rate card** `NEW` — the KPI above, with a trend indicator if historical data
   supports it (may need a lightweight daily-snapshot table if querying live history
   becomes slow — flagged as an implementation detail, not decided here).
3. **Incident summary** `NEW` — counts by status, link into a filtered list (reuses
   `IncidentStatusPill`/`IncidentRoutePill` from the existing design system per
   `DESIGN.md`).
4. **Registration completion** `NEW` — the self-registration gap metric, with a link into
   `manage-teams-workers.md`'s "no email yet" filter for direct follow-up.
5. **Empty/loading states** per card, consistent with `EmptyState` conventions elsewhere.

## Actions & side effects

Read-only. Links out to `manage-teams-workers.md` and `coverage-approvals.md`/incident
lists for anything actionable — this screen is a dashboard, not a place mutations happen.

## Permissions

`ADMIN`/`SUPER_ADMIN` only.

## Open questions

- Whether historical trend lines need a dedicated snapshot/rollup table or can be
  computed live from `Shift`/`Incident` timestamps depends on data volume this pass
  doesn't have visibility into yet (246 real workers today; unclear at what scale live
  aggregation stops being fast enough). Flagged as a build-time decision, not a design
  blocker.
