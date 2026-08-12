# Module: Coverage engine `NEW`

The business logic behind answering "who replaces me" for real — the module this entire
redesign pass exists to add. Consumed by two screens (`request-coverage.md`,
`coverage-approvals.md`) and read by two more (`worker-dashboard.md`,
`team-lead-dashboard.md`). Entities: `CoverageRequest`, `Shift.replacementId` — see
`data-model.md`.

## Why this exists

The daily Excel roster (`excel-import.md`) has no concept of coverage — it's a flat list
of who's assigned where. Replacement has always had to happen through phone calls: a
worker calls their team lead, the team lead calls around to find someone, everyone
remembers verbally who's covering whom. This module is the in-app replacement for that
call chain, not a UI wrapper around data that already existed.

## The two write paths

Both end at the same place — `Shift.replacementId` set, both people notified — so every
downstream screen only needs to read `Shift.replacementId`, never care which path set it.

### 1. Direct assignment (team lead / shibutz)

A team lead or scheduler picks any shift on their roster and assigns (or changes, or
clears) its replacement directly — no request, no approval step, because they *are* the
approver. This is the escape hatch for every case that doesn't fit the request flow:
scheduler-arranged swaps, correcting a mistake, covering a shift whose worker never filed
a request at all.

```
assignReplacement(shiftId, replacementId | null, actingUserId)
  1. Load the shift; verify actingUserId leads the shift's team (or is SHIBUTZ/ADMIN).
  2. If replacementId given: verify that user exists, is PAKAHIM role, and — per the
     open question in data-model.md — is on the same team as the shift (v1 assumption).
  3. Set Shift.replacementId. Do not change Shift.status (direct assignment doesn't imply
     sick/holiday — the original worker might just be swapping shifts with a peer).
  4. Notify the new replacement (and the original worker, if different from the actor) —
     see notifications.md.
```

### 2. Requested coverage, approved (worker → team lead)

```
requestCoverage(shiftId, requestedById, reason, note?, proposedReplacementId?)
  1. Verify requestedById owns the shift (Shift.workerId === requestedById).
  2. Verify no existing PENDING CoverageRequest for this shift (one at a time).
  3. Verify shift.startTime is in the future (can't request coverage for a shift already
     underway or past — surfaced as a validation error, not silently allowed).
  4. Create CoverageRequest{status: PENDING, reason, note, proposedReplacementId}.
  5. Notify the shift's team lead — this is the primary "someone needs a decision" signal.

decideCoverageRequest(requestId, decidedById, decision: APPROVE | REJECT, finalReplacementId?, decisionNote?)
  1. Verify decidedById leads the shift's team.
  2. Verify request.status === PENDING (can't decide twice).
  3. If APPROVE:
     a. finalReplacementId defaults to request.proposedReplacementId if the team lead
        didn't override it; error if neither is set (a lead must pick someone to approve).
     b. Set Shift.replacementId = finalReplacementId.
     c. Set Shift.status = SICK if reason===SICK, HOLIDAY if reason===HOLIDAY, else leave
        as-is (a SWAP doesn't change the original worker's own attendance status).
     d. Set request.status = APPROVED, decidedById, decidedAt, decisionNote.
     e. Notify: the requester (approved) and the new replacement (assigned) — two
        different notifications, see notifications.md.
  4. If REJECT:
     a. Set request.status = REJECTED, decidedById, decidedAt, decisionNote.
     b. Shift is untouched.
     c. Notify: the requester only (rejected, with decisionNote if present).

cancelCoverageRequest(requestId, actingUserId)
  1. Verify actingUserId === request.requestedById AND request.status === PENDING.
  2. Set request.status = CANCELLED. No notifications (the requester already knows).
```

## Reciprocal visibility

`worker-dashboard.md`'s "My Shift" card shows two things this module makes possible for
the first time with real data:
- **Who replaces me** — `Shift.replacementId` resolved to name/city/phone, exactly as
  `SPEC.md` §3.2 originally described (now actually populated).
- **Who I'm covering for** — the reciprocal: any `Shift` where `replacementId ===
  currentUserId`, surfaced as a separate "you're covering" card so a worker who agreed to
  cover a shift can see it without hunting for it.

## What this module deliberately does not do (v1)

- No auto-matching / suggested-replacement algorithm (e.g. "these 3 people are free that
  day") — the worker or team lead picks manually. Automation is a reasonable v2, not
  required to close the core gap.
- No SLA/escalation if a team lead ignores a pending request — see the open question in
  `data-model.md` about expiry. Flagged, not built, since there's no scheduler/cron
  infrastructure in the codebase to run it on today.
- No direct worker-to-worker swap negotiation inside the app (e.g. worker A proposes to
  worker B, B accepts, then it goes to the lead) — `proposedReplacementId` assumes that
  conversation already happened outside the app (phone/WhatsApp), same as today, and the
  app only captures the outcome. A fuller peer-negotiation flow is future scope.
