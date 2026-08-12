# Data model

Source of truth for every entity referenced by the screen/module docs in this folder.
Where an entity or field is **new** (doesn't exist in `prisma/schema.prisma` today), it's
marked `NEW`. Where an existing field's meaning or shape changes, it's marked `CHANGED`.
Everything else documents the current, already-implemented schema.

## Entity overview

```
Tenant ──< Team ──< User ──< Shift ──< CoverageRequest (NEW)
              │        │        │
              │        │        └──< Incident ──< IncidentRecipient
              │        └── ledTeams (a User with role TEAM_LEAD can lead >1 Team)
              └── one Team per region imported from the roster Excel
Tenant ──< ShiftFile (upload audit log)
Tenant ──< DiscoveryAnswer (internal, unrelated to product UX)
```

Single tenant in practice (`getDefaultTenantId()`), but every table is tenant-scoped —
multi-tenancy is schema-ready, not schema-blocked, for whenever a second rail company
onboards.

## `Tenant`

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | |
| `name` | `String` | |
| `slug` | `String` unique | `"default"` today |
| `subscriptionPlan` | `String` | `free \| pro \| enterprise` — unused by any current screen |
| `createdAt`, `updatedAt` | `DateTime` | |

## `User`

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | |
| `tenantId` | `String` | FK → `Tenant` |
| `email` | `String?` | Nullable — workers created from a roster import have no email until they self-register. `@@unique([tenantId, email])`. |
| `phone` | `String?` | |
| `password` | `String?` | Unused today (OTP-only login); kept for a possible future password path. |
| `firstName`, `lastName` | `String?` | For roster-imported workers, the full name lands in `firstName` until the worker self-registers and splits it (see `login-onboarding.md`). |
| `city` | `String?` | |
| `workerNumber` | `String?` | The real-world identifier (`מספר עובד`). `@@unique([tenantId, workerNumber])`. This, not email, is what a worker types to log in. |
| `role` | `UserRole` | `SUPER_ADMIN \| ADMIN \| SHIBUTZ \| TEAM_LEAD \| TAKAHIM \| MAINTENANCE` |
| `teamId` | `String?` | FK → `Team`. Null for `ADMIN`/`SHIBUTZ`. |
| `fcmToken` | `String?` | For push notifications (not currently sent from any flow — see `notifications.md`). |
| `createdAt`, `updatedAt` | `DateTime` | |

## `Team`

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | |
| `tenantId` | `String` | |
| `name` | `String` | The region label as it appears in the imported roster (e.g. "צוות צפון", "פקחים דרום"). `@@unique([tenantId, name])`. |
| `teamLeadId` | `String` | FK → `User` (`role = TEAM_LEAD`). |

**Known shape, not a bug:** a `TEAM_LEAD` can lead more than one `Team`, because the
importer creates one `Team` per region label and assigns them all to the tenant's first
`TEAM_LEAD` (the roster file has no per-region lead). Every query that reads "a lead's
team" must accept `teamId: string | string[]` — see `roles-permissions.md`.

## `Shift`

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | |
| `tenantId` | `String` | |
| `workerId` | `String` | FK → `User`. The shift's owner. |
| `teamId` | `String` | FK → `Team`. |
| `date` | `DateTime` | Date only, no time. |
| `startTime`, `endTime` | `DateTime` | Full timestamps. |
| `status` | `ShiftStatus` | `SCHEDULED \| STARTED \| COMPLETED \| CANCELLED \| HOLIDAY \| SICK` |
| `replacementId` | `String?` `CHANGED` | **Today:** a bare string, not a real relation — `shift-service.ts` resolves it with a manual second `findUnique` call, and nothing enforces it points at a real user. **Redesigned:** a proper FK — `replacement User? @relation("ShiftReplacement", fields: [replacementId], references: [id])`. Same column, now DB-enforced. |
| `region` | `String?` | Region label as imported, kept even after `teamId` resolves, for audit/debugging. |
| `notes` | `String?` | Free text combined from the import: route, train-set numbers, Mirs radio id, trainee pairing, reserve-list tag. |
| `createdAt`, `updatedAt` | `DateTime` | |

**Who sets `replacementId` today:** nobody. The Excel importer never touches it (verified
by grep and by inspecting the real source file — see `excel-import.md`). **Who sets it in
the redesign:** either a team lead's direct assignment, or an approved `CoverageRequest`
— see `coverage-engine.md`. This is the actual fix for the core gap this redesign pass
exists to close.

## `CoverageRequest` `NEW`

The record of a worker asking not to work a shift as scheduled, and the team lead's
decision on it. One row per request; a shift can have multiple requests over time
(e.g. a rejected request followed by a different one), but at most one `PENDING` request
per shift at a time (enforced in the API layer, not a DB constraint, since "pending" is a
status value not a separate table).

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | |
| `tenantId` | `String` | |
| `shiftId` | `String` | FK → `Shift`. The shift the request is about. |
| `requestedById` | `String` | FK → `User`. Always the shift's own `workerId` — a worker can only request coverage for their own shift, never someone else's (see `roles-permissions.md`). |
| `reason` | `CoverageReason` | `SICK \| HOLIDAY \| SWAP \| OTHER` |
| `note` | `String?` | Free text — required when `reason = OTHER`, optional otherwise. |
| `proposedReplacementId` | `String?` | FK → `User?`. The worker's own suggestion, if they have one (e.g. arranged a swap informally already). Optional — a worker can request coverage without knowing who'll cover it. |
| `status` | `CoverageRequestStatus` | `PENDING \| APPROVED \| REJECTED \| CANCELLED` |
| `decidedById` | `String?` | FK → `User?`. The team lead who approved/rejected. Null while `PENDING`. |
| `decidedAt` | `DateTime?` | |
| `decisionNote` | `String?` | Team lead's optional note, especially useful on rejection. |
| `createdAt`, `updatedAt` | `DateTime` | |

**On `APPROVED`:** the approving action sets `Shift.replacementId` to the team lead's
final choice (which may or may not match `proposedReplacementId` — the team lead can
override it), and sets `Shift.status` to `SICK`/`HOLIDAY` if that was the reason (leaves
it `SCHEDULED` for a plain `SWAP`). This is the single write path that actually populates
replacement data end to end — see `coverage-engine.md` for the full state machine.

**On `CANCELLED`:** only the original requester can cancel their own still-`PENDING`
request (e.g. they no longer need it). Does not touch the `Shift` row.

## `Incident`

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | |
| `tenantId` | `String` | |
| `workerId` | `String` | FK → `User`. The reporter. |
| `teamLeadId` | `String` | FK → `User`. The reporter's team lead at time of report — always a recipient regardless of route. |
| `title`, `description` | `String` | |
| `status` | `IncidentStatus` | `OPEN \| ACKNOWLEDGED \| RESOLVED` |
| `severity` | `String` | `low \| normal \| high \| critical`, default `normal` |
| `route` | `IncidentRoute` | `TEAM_LEAD \| MAINTENANCE \| EMERGENCY_BROADCAST` |
| `createdAt`, `resolvedAt`, `updatedAt` | `DateTime?` | |

## `IncidentRecipient`

Fan-out join table — one row per user who should see a given incident.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | |
| `incidentId` | `String` | FK → `Incident` |
| `userId` | `String` | FK → `User` |
| `createdAt` | `DateTime` | |

`@@unique([incidentId, userId])`. Recipient set by route: `TEAM_LEAD` → just the lead;
`MAINTENANCE` → lead + every `MAINTENANCE`-role user in the tenant; `EMERGENCY_BROADCAST`
→ lead + every `TEAM_LEAD`/`MAINTENANCE`/`ADMIN` user in the tenant.

## `ShiftFile`

Upload audit record, one per `/admin/upload` submission.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | |
| `tenantId` | `String` | |
| `filename` | `String` | |
| `fileUrl` | `String` | Currently a `local://` placeholder — no real cloud storage wired up. |
| `uploadedBy` | `String` | `User.id`, not a real FK. |
| `status` | `FileStatus` | `PENDING \| VALIDATED \| IMPORTED \| FAILED` |
| `errorMessage` | `String?` | |
| `importedShiftCount` | `Int?` | |
| `createdAt` | `DateTime` | |

## `DiscoveryAnswer`

Internal capture of the client discovery interview Q&A (`/api/discovery`). Not part of
the product's worker-facing runtime — documented here only for completeness.

| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | |
| `questionId` | `String` unique | |
| `section`, `question`, `answer` | `String` | |
| `method` | `String?` | `typed \| voice` |
| `createdAt`, `updatedAt` | `DateTime` | |

## New enums `NEW`

```prisma
enum CoverageReason {
  SICK
  HOLIDAY
  SWAP
  OTHER
}

enum CoverageRequestStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}
```

## Open questions (flagged, not decided)

- Can a worker propose *any* teammate as a replacement, or only someone on the same
  `Team`/shift-region? Assumed same-team for v1 (see `coverage-engine.md`); needs
  confirming against how swaps actually happen operationally.
- What happens to a `PENDING` request if the shift's `startTime` passes before a team
  lead decides? Assumed: the request auto-expires to `REJECTED` with a system-generated
  `decisionNote`, but this needs a scheduled job that doesn't exist anywhere in the
  codebase today (no cron/queue infra) — flagged as an implementation dependency, not a
  design gap.
- Should `CoverageRequest` cascade-delete if the `Shift` it references is deleted (e.g. a
  re-upload replaces that date's shifts — see `excel-import.md`)? Assumed yes
  (`onDelete: Cascade`, matching the existing `Shift` → `Incident` cascade pattern), but
  that means a scheduling re-upload can silently wipe a pending approval — worth a loud
  warning in the upload UI (see `schedule-upload.md`) rather than a silent loss.
