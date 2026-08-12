# Pakahim Shift Manager — Product Spec

Grounded in the client discovery interview (2026-08-10, 12 questions, `DiscoveryAnswer` table / `/discovery.html`).
This is the working spec for the current build pass. Where it resolves a previously
open conflict from `CLAUDE.md`, the resolution and reasoning are called out explicitly.

## 1. Who this is for

A shift coordinator at Israel Railways described today's process as "בלאגן" (a mess):
the only way a **פקח (מנהל נסיעה)** — train inspector — finds their own shift is by
opening a daily Excel file emailed by the scheduling department (מחלקת שיבוץ) around
12:30–13:00, and manually searching it for their own name.

**Success, in the client's words:** every פקח can log in and immediately see today's
shift. Every worker enters their own details once, so the whole roster becomes
searchable. Reachable by every shift-based Israel Railways employee eventually —
not just a pilot group.

## 2. Scope for this build

- **Org:** Israel Railways only. Single tenant. Not building multi-tenant UI for this pass.
- **Roles in scope:** פקחים (inspectors) only. Drivers/other shift roles are future.
- **Roles in the system:**
  - `PAKAHIM` (פקח) — sees their own shift, who replaces them, team status, reports incidents.
  - `TEAM_LEAD` (ראש צוות) — sees team roster/status, receives and resolves incident reports,
    is the first stop for sick/leave requests.
  - `SHIBUTZ` — publishes the weekly/daily schedule.
  - `ADMIN` — uploads the roster Excel, manages the platform.
  - `SUPER_ADMIN` — cross-tenant (not exposed in this pass's UI).
  - `MAINTENANCE` (מחלקת אחזקה) — receives and resolves train-equipment incident reports
    (q7). New this pass — see §3.4.

Note on naming: the client-confirmed term is **פקח (מנהל נסיעה)**. All user-facing copy
already uses פקח via `lib/he.ts`. The `PAKAHIM` enum value and internal identifiers
(`PakahimDashboard`, package name) — previously "Takahim" — were renamed to "Pakahim"
(2026-08-12, see `CLAUDE.md`'s resolved terminology note) as the chosen English
identifier, distinct from and secondary to the Hebrew user-facing term above. That rename
covered every layer — enum, code, package/repo name, GHCR image, deploy path, container
names, and the live domain — using a Postgres `RENAME VALUE` migration for the enum so no
existing row's data was touched.

## 3. Core flows (this build)

### 3.1 Identity & onboarding
Worker enters worker number → if unknown, self-registers (name, phone, email, city) →
OTP to email → session. Directory of workers becomes searchable by name for everyone
(matches "כל מי שרוצה לחפש אותה יוכל" from q2). Already built; this pass is a visual
rebuild, not a flow rebuild.

### 3.2 My shift
Worker sees: start/end time, who replaces them (name, city, phone), who they're
replacing. Roster fields per the real Excel: מספר סידור, שעת סיום, מספר מירס, מספר עובד
(confirmed q3, matches `lib/services/upload-service.ts`).

### 3.3 Team status
Team lead / worker sees who's on shift, on holiday, on sick leave.

### 3.4 Incident reporting
Worker reports an incident with severity **and route**, matching q7 verbatim: a regular
fault → team lead; a train-equipment fault → also מחלקת אחזקה (maintenance department);
an emergency → "נוהל אירועים אחד" fanning out to every relevant party at once. Built via
`Incident.route: TEAM_LEAD | MAINTENANCE | EMERGENCY_BROADCAST` plus an
`IncidentRecipient` fan-out table (one row per user who should see the incident).

Assumptions made (not literally in the client's words, flagged rather than silently
decided):
- The worker's team lead is **always** a recipient regardless of route — q7's first
  sentence states team-lead reporting as the baseline; MAINTENANCE/EMERGENCY_BROADCAST
  add recipients on top rather than replacing the team lead.
- `MAINTENANCE` recipients = every user with the new `MAINTENANCE` role in the tenant
  (a role didn't exist before this pass; added since the client named מחלקת אחזקה as a
  distinct destination, not a nickname for an existing role — unlike "פטיש", see below).
- `EMERGENCY_BROADCAST` ("כל הגורמים הרלוונטים") = every `TEAM_LEAD`, `MAINTENANCE`, and
  `ADMIN` user in the tenant. No explicit recipient list exists in the discovery answers;
  this is the broadest reasonable reading of "all relevant parties," worth confirming
  with the client before this ships beyond a demo.
- WhatsApp stays deep-link-only per conflict #1 below — the report form shows a
  `wa.me` link to the team lead after submit, it does not attempt to message
  maintenance/emergency recipients (no phone list to target, and Business API integration
  is still out of scope).

A team lead or maintenance-dept user can acknowledge/resolve any incident they're a
recipient of (`IncidentRecipient` membership), not just ones addressed to them by
`teamLeadId` — this is what makes fan-out actually work end to end.

### 3.5 Schedule import
Admin uploads the daily Excel (`/admin/upload`), preview → confirm → import.
**Client's actual ask** is zero-click sync the moment scheduling emails the file
(~12:30–13:00 daily). That needs inbox polling or a watched folder — infra decision,
not a UI decision, and explicitly deferred past this pass. The upload screen in this
pass is designed so swapping "manual file picker" for "auto-detected file, click to
confirm" later doesn't require a redesign (preview/confirm step already exists as its
own state).

## 4. Resolved conflicts (this pass)

| # | Conflict | Resolution for this build | Why |
|---|----------|---------------------------|-----|
| 1 | Notification channel: client wants WhatsApp + in-app push; existing build assumes FCM/email only | Keep in-app + email as the system of record (delivery guarantee, no bot infra). Use `wa.me` deep links — already implemented in `lib/utils/whatsapp.ts` for "contact my replacement" — as the WhatsApp touchpoint: one tap opens a pre-filled WhatsApp chat, no Baileys/Business API needed. Extend the same pattern to "notify team lead" on incident report. | Full WhatsApp bot integration (Baileys/Business API) was already ruled out for a same-day build; deep links get 80% of the client's actual want (open WhatsApp with the right person) at near-zero infra cost. Full bot integration stays a real roadmap item, not something to fake. |
| 2 | "פטיש" role, unclear if distinct from ראש צוות | Treated as the same person/role as `TEAM_LEAD` for this build — the client's own phrasing ("לראש צוות לשבץ ופטיש... מי שמאשר... זה הפטיש") reads as one approval chain, not three separate roles. **Not silently finalized** — flagged in this doc and in copy comments so a real answer from the client can override it without a data model change (approval is already gated on `TEAM_LEAD`, not on a new enum value). | Avoids inventing a role/table for a term whose scope is still ambiguous, while not blocking the leave/sick approval UI on getting that answer first. |
| 3 | Terminology ("Takahim" vs פקח) | ~~Resolved 2026-08-12~~: user-facing copy already used פקח everywhere; internal identifiers renamed "Takahim" → "Pakahim" across every layer (see note above §1). | A Prisma enum value rename touches existing rows, so it got its own dedicated migration + verification pass (`ALTER TYPE ... RENAME VALUE`, zero data loss) rather than being bundled into an unrelated change. |
| 4 | Auto-sync of daily Excel | Deferred, documented above. Manual upload preview/confirm UI kept, designed to extend cleanly. | Needs an infra decision (poll vs. watched folder) that has nothing to do with this pass's actual ask (make the app look and feel real). |

## 5. What this pass actually delivers

Given the goal for this session is "plan a smart app and implement a real application
that looks like a real modern 2026 AI product — clean and beautiful," the highest-value,
lowest-risk work is:

1. This spec + `DESIGN.md`, grounded in real client answers, not invented scope.
2. A real design system (`app/globals.css` tokens + `app/_components/ui/*`) replacing the
   ad-hoc `border-black/10` + flat buttons currently in every page.
3. Rebuilding the existing, already-correct flows (login/OTP, worker dashboard, team lead
   dashboard, admin upload) on top of that design system — same data, same API routes,
   new visual layer.
4. Verified: typecheck, lint, build, and a live local run after the rebuild.

No new roles, no new tables, no new API routes in this pass — the backend is already
correct per the client's answers; what's missing is a UI that looks like it was designed,
not scaffolded.
