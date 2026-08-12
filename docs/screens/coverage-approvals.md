# Screen: Coverage approvals `NEW`

The other core screen this redesign adds — where a team lead (or `SHIBUTZ`/`ADMIN`, per
`roles-permissions.md`'s "פטיש" open question) actually closes the "who replaces me" gap.
Linked from `team-lead-dashboard.md`'s pending-requests card; can also be reached
directly for shibutz/admin who aren't team leads.

## Purpose

This is the screen that makes `Shift.replacementId` a real, populated field for actual
production data instead of a column nothing ever sets. Two things happen here: deciding
worker-filed requests, and directly assigning/changing a replacement without a request at
all (`coverage-engine.md`'s two write paths, both live on this one screen).

## Data used

`listPendingCoverageRequests(teamId[])` for the request queue. Full roster (`Team`
members) for the "assign directly" picker and for overriding a request's proposed
replacement. Writes `CoverageRequest` + `Shift.replacementId` — see `data-model.md`,
`coverage-engine.md`.

## States

1. **Pending requests queue** — one row per `PENDING` `CoverageRequest`: requester,
   shift date/time, reason, proposed replacement (if any, shown as a suggestion the lead
   can accept or override), note.
2. **Decision panel** (per row, expand or modal) — approve (confirm proposed replacement,
   or pick a different teammate from the roster) or reject (optional note, especially
   useful here since the requester sees it). Approve requires *someone* be picked — no
   "approve with no replacement" state, since that would leave the shift uncovered with a
   request marked resolved, a worse state than staying pending.
3. **Direct-assign panel** — separate from the queue, for any upcoming shift on the
   roster whether or not it has a request: pick/change/clear a replacement. This is the
   escape hatch for scheduler-arranged swaps that never went through a formal request.
4. **Empty state** — no pending requests; direct-assign panel is still available (it's
   not gated on requests existing).
5. **Confirmation toast** on decide/assign, matching existing `he.success.*` patterns.

## Actions & side effects

- Approve → `PATCH /api/coverage-requests/[id]` `NEW` (`decision: APPROVE`,
  `finalReplacementId`) → `Shift.replacementId` set, `Shift.status` updated per reason,
  requester + replacement both notified (see `notifications.md`).
- Reject → same endpoint, `decision: REJECT` → requester notified only.
- Direct assign → `PATCH /api/shifts/[id]/replacement` `NEW` → `Shift.replacementId` set
  directly, replacement (+ original worker if different from the actor) notified.

## Permissions

`TEAM_LEAD` (own team(s) only), `SHIBUTZ`/`ADMIN` (any team) — see the permission matrix
in `roles-permissions.md` and its reasoning re: the unresolved "פטיש" question.

## Open questions

- Should a rejected request's requester be able to immediately file a new one (different
  reason/proposal), or is there a cooldown? Assumed: immediately, no cooldown — a
  rejection isn't a penalty, just "not this proposal." Not confirmed against a client
  answer.
- The roster picker for direct-assign/override needs to exclude workers who are
  themselves scheduled to work at an overlapping time (can't cover a shift while working
  your own) — this is new validation logic not present anywhere in the codebase today
  (no existing overlap-detection query). Flagged as a real implementation requirement,
  not just a nice-to-have, since approving an overlapping assignment silently would be
  worse than the current "no replacement shown" state.
