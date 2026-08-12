# Module: Roles & permissions

Six roles (`UserRole` enum), all defined today, no new roles proposed in this pass.

| Role | Hebrew | Who | Sees |
|---|---|---|---|
| `TAKAHIM` | פקח (מנהל נסיעה) | Train inspector | Own shift, own team's status, incident reporting, coverage requests |
| `TEAM_LEAD` | ראש צוות / פטיש | Manages one or more `Team`s | Team roster, team status, incidents addressed to them, coverage approvals for their team(s) |
| `SHIBUTZ` | משבץ | Scheduler | Uploads roster Excel, can directly assign shift replacements (same authority as a team lead for this action — see `coverage-engine.md`) |
| `ADMIN` | מנהל | Tenant admin | Everything `SHIBUTZ` sees, plus team/worker management and analytics |
| `SUPER_ADMIN` | — | Platform admin | Cross-tenant (no UI in this pass — single tenant in practice) |
| `MAINTENANCE` | מחלקת אחזקה | Equipment fault desk | Incidents routed `MAINTENANCE` or `EMERGENCY_BROADCAST` |

## The multi-team-lead gotcha

A `TEAM_LEAD` can lead more than one `Team` — the roster importer creates one `Team` per
region label in the Excel file and assigns them all to the tenant's first `TEAM_LEAD`
(the file has no per-region lead field). This already caused one real bug
(`getTeamLedBy` → `getTeamsLedBy` rename, see project history) and is easy to
reintroduce: **any query or permission check scoped to "a team lead's team" must accept
`teamId: string | string[]`, never assume exactly one.** This applies to the new
`coverage-approvals.md` screen too — a lead must see pending requests across every team
they lead, not just one.

## Permission matrix (screen-level)

| Screen | TAKAHIM | TEAM_LEAD | SHIBUTZ | ADMIN | MAINTENANCE |
|---|:-:|:-:|:-:|:-:|:-:|
| Worker dashboard | ✅ (own data) | — | — | — | — |
| Report incident | ✅ | — | — | — | — |
| Request coverage | ✅ (own shifts) | — | — | — | — |
| Team lead dashboard | — | ✅ (own team(s)) | — | — | — |
| Coverage approvals | — | ✅ (own team(s)) | ✅ (any team — see below) | ✅ (any team) | — |
| Schedule upload | — | — | ✅ | ✅ | — |
| Manage teams/workers | — | — | — | ✅ | — |
| Admin dashboard & analytics | — | — | — | ✅ | — |
| Maintenance dashboard | — | — | — | — | ✅ |

**Why `SHIBUTZ`/`ADMIN` can also decide coverage requests, not just the team lead:**
per the client interview, "פטיש" — the actual approver — is unconfirmed as a distinct
role or a nickname for team lead (`SPEC.md` conflict #2, still open). Rather than block
the whole coverage-approvals screen on that answer, both `TEAM_LEAD` and
`SHIBUTZ`/`ADMIN` get approval authority; if "פטיש" turns out to be a separate role, it's
a permission-matrix edit, not a data-model change (approval already isn't hard-coded to
a specific enum value beyond "authorized role").

## Auth boundary (how permission checks actually happen)

Every authenticated request carries `x-user-id`/`x-user-role` headers (injected upstream
— see `auth-sessions.md`). Route handlers read these directly; there is no
`middleware.ts` doing the injection in this scan, which is itself worth confirming/fixing
before this redesign's new routes (`/api/coverage-requests/*`) ship — see
`auth-sessions.md`'s open question.
