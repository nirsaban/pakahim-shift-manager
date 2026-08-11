# Takahim Shift Manager

**Takahim Shift Manager** — A PWA for Israeli train workers to manage shift schedules, see next shifts, track team status, and report incidents in real-time.

**Brand:** Genericflow Brain  
**Product Type:** PWA Web App  
**Language:** Hebrew (RTL only)  
**Target Users:** Train operators (Takahim), Shift schedulers (Shibutz), Team leads

## Client Discovery Interview (2026-08-10)

Real answers gathered directly from the client (an Israel Railways shift coordinator) via a 12-question voice/typed interview tool at `/discovery.html`, backed by the `DiscoveryAnswer` Prisma model. This is ground truth from the person who actually runs this process — where it disagrees with the rest of this document, **trust this section** and flag the conflict rather than silently picking one.

**Why this exists:** The current process is "בלאגן" (a mess) — a worker's only way to know their own shift (start/end time) or find out who's covering for them (and that person's city/phone) is to dig through a mailed Excel file by hand.

**Definition of success (client's own words):** every פקח / driver can log into the app and immediately see their shift for the day. Every worker enters their own personal details once, so the whole roster is searchable by name. The app must be reachable by every shift-based Israel Railways employee — not just a pilot group.

### Roles — phase 1 scope
- Phase 1 covers **פקחים (inspectors)** only — not drivers or other shift-based roles yet, despite the "every shift-based employee" long-term goal above.
- The correct Hebrew title is **"פקח (מנהל נסיעה)"** — confirms the earlier terminology correction in [[worker-number-auth-2026-08-02|memory]]; still not fully propagated through this file (see Conflicts below).
- Fields that exist per roster line today: מספר סידור (schedule number), שעת סיום (end time), מספר מירס (Mirs radio number), מספר עובד (worker number).
- Sick/leave requests go from the worker to **ראש צוות / משבץ**; approval itself is done by a role the client calls **"פטיש"** — meaning not yet confirmed, see Conflicts below.

### Shift scheduling — real process today
- The scheduling department (מחלקת שיבוץ) emails an Excel file daily around **12:30–13:00**; each worker manually searches the file for their own name.
- Client's ask: the moment that file lands, it should sync into the app automatically (no manual admin upload step), and a worker should be able to type/search their name (or just log in) and immediately see their own slot, who replaces them, and who they're replacing.
- This is a step beyond the current implementation, which imports on manual admin upload (`/admin/upload`) rather than on a schedule — worth a follow-up decision on whether to poll a mail inbox or a watched folder.

### Incident handling
- Regular fault → worker reports to **ראש צוות**.
- Train-equipment fault → routed to **מחלקת אחזקה** (maintenance department) — this routing doesn't exist in the app yet.
- Emergency → a single incident procedure ("נוהל אירועים אחד") fans out to all relevant parties at once, not just the direct team lead.

### Notifications
- Preferred channels are **in-app push AND WhatsApp** — explicitly not email-only.
- This directly conflicts with the FCM-only non-negotiable below and the email-OTP/no-WhatsApp scope decision from [[scope-decisions-2026-08-01|memory]] — see Conflicts.

### Organization scope
- Confirms the existing single-tenant build decision: the app should serve **only Israel Railways**, and only פקחים for now. No multi-tenant ask from the client — do not build this speculatively.

### Worker identity & onboarding
- A new worker enters their own name, worker number, phone, email, and city directly in the app; that directory becomes visible/searchable to other workers (matches this doc's existing Onboarding bullet under Core Features).

### Excel data source
- Confirmed: **one sheet**, internally divided into sections (matches the real multi-region-table format already handled by `lib/services/upload-service.ts`, see [[real-roster-import-2026-08-02|memory]]).

### Roadmap — what matters after MVP
- Let schedulers/team leads ("המשבצים... או הפטיש") push updates, שינויים (changes) and בלת״ם (unplanned events) into the app directly, and have leave/sick-day constraints update automatically — instead of the current phone-call-heavy workflow.

### ⚠ Open conflicts to resolve before building further
1. **Notification channel** — client wants WhatsApp + in-app push; Non-Negotiable Convention #6 below and the earlier scope decision both assume FCM/email only. Needs an explicit decision (WhatsApp likely means Baileys or a business API, which was previously ruled out as too heavy for a same-day build — re-evaluate now that it's a real client ask, not a nice-to-have).
2. **"פטיש"** — used by the client as whoever approves leave/sick/holiday requests. Unclear if this is a distinct role, a nickname for ראש צוות, or a speech-to-text transcription artifact. Confirm with the client before mapping it to `TEAM_LEAD` or a new role.
3. **Terminology** — this document and several identifiers (`UserRole.TAKAHIM`, `TakahimDashboard`, the package name, the product name itself) still say "Takahim," but the client-confirmed term is **פקח**. A full rename pass is still outstanding (noted since [[worker-number-auth-2026-08-02|memory]], now client-confirmed rather than assumed).
4. **Auto-sync of the daily Excel** — client wants zero-click ingestion the moment scheduling emails the file; today it requires a manual admin upload. Needs a decision on mechanism (inbox polling vs. watched folder vs. keeping it manual for now).

## Stack

- **Frontend:** Next.js 15 (App Router, TypeScript, PWA-enabled)
- **UI:** Tailwind CSS (logical properties for RTL), Lucide React icons
- **Backend:** Next.js API Routes, Node.js
- **Database:** PostgreSQL 16 + Prisma 6
- **Session:** Redis 7 (ioredis)
- **Push Notifications:** Firebase Cloud Messaging (FCM)
- **Media:** Excel file uploads (xlsx parser)
- **Auth:** JWT + Argon2 password hashing (jose + @node-rs/argon2)
- **Validation:** Zod

## User Roles

1. **ADMIN** — Uploads Excel shift files, manages platform
2. **SHIBUTZ** — Creates/manages weekly shift schedules (read-only after publish)
3. **TAKAHIM** — Train operators: see next shifts, who covers them, report incidents
4. **TEAM_LEAD** — Manages a team: monitors shift status, holidays, sick days, receives incident reports

## Core Features

### For Takahim (Workers)
- Onboarding: name, phone, city (from Israel API), worker number
- **My Shift:** See next shift, who is replacing them
- **Team Status:** Who is on shift, holiday, sick day
- **Report Incident:** Send real-time push to team lead with details

### For Shibutz
- Upload Excel file with weekly shift schedule
- Preview before publish (data validation)
- Lock schedule after publish (read-only for team leads)

### For Team Leads
- Dashboard: team status at a glance
- Real-time incident notifications
- View worker details, contact info
- Confirm/resolve incident reports

### For Admins
- Manage teams, team leads, workers
- View analytics: coverage, incident reports
- Configure notification settings

## Non-Negotiable Conventions

### 1. RTL Hebrew Always
- Use Tailwind **logical properties** only: `ms-*`/`me-*`, `ps-*`/`pe-*`, `start-*`/`end-*`, `text-start`/`text-end`
- **Never** use `ml-*`/`mr-*`/`left-*`/`right-*`
- All user-facing strings in `src/lib/he.ts` (no hardcoded Hebrew)
- `dir="rtl"` on `<html>` element

### 2. Auth & Sessions
- Sessions live in Redis (`sess:{sessionId}`), not the database
- Every authenticated request must verify `EXISTS sess:{sessionId}` (middleware check)
- JWT is transport-only; Redis is source of truth for session liveness
- Never trust JWT alone for access control

### 3. Tenant Isolation (Multi-tenancy)
- Each train company = one tenant
- Use scoped Prisma client (injects `tenantId` into every query)
- Postgres RLS policies enforce row-level security by tenant
- Admin panel has cross-tenant views (super-admin role)

### 4. Validation at Boundaries
- Every API route validates input with Zod schema
- `src/lib/validation/` contains all schemas
- Middleware validates JWT + session liveness before route access

### 5. Security
- No secrets in repo; use `.env.example` for all env vars
- Excel uploads: validate file structure before importing
- Firebase FCM secrets: server-side only (env vars)
- Passwords: hash with Argon2, never store plain text

### 6. Push Notifications
- FCM for real-time incident alerts to team leads
- Graceful fallback: in-app notification if device not registered
- Incident report payload must include: reporter ID, team, timestamp, description

### 7. Data Model
- Workers: name, phone, city, worker_number, team_id, tenant_id
- Shifts: worker_id, start_time, end_time, date, team_id, tenant_id
- Incidents: worker_id, team_lead_id, title, description, created_at, resolved_at, tenant_id
- Teams: name, team_lead_id, tenant_id
- Tenants: name, subscription_plan, created_at

## Layout

```
app/
  t/                          # Tenant routes
    auth/
      [slug]/login           # Worker login + phone OTP
      [slug]/onboarding      # Name, city, worker_number
    dashboard/               # Worker dashboard (my shift, team status)
    admin/                   # Admin panel (tenant management)
  api/
    auth/                    # Login, register, JWT, session
    shifts/                  # Get next shift, shift details
    teams/                   # Team status, team members
    notifications/           # FCM registration, incident reports
    uploads/                 # Excel file import, validation
  superadmin/                # Platform admin (cross-tenant views)

lib/
  auth/                      # JWT, Argon2, session validation
  db/                        # Prisma client, tenant scoping
  validation/                # Zod schemas
  he.ts                      # Hebrew strings dictionary
  services/                  # Business logic (shift lookup, incident handling)

prisma/
  schema.prisma              # Database schema with RLS policies
```

## Commands

- `npm run dev` — dev server on localhost:3000 (needs `.env.local`, Postgres + Redis running)
- `npm test` — Vitest (use ioredis-mock)
- `npm run build` — next build
- `npm run db:migrate` — Prisma migrations
- `npm run db:seed` — Seed demo data
- `docker compose up --build` — full stack with Postgres + Redis

## Getting Started

1. `npm install`
2. Create `.env.local` (copy from `.env.example`)
3. `docker compose up -d postgres redis` (or use managed services)
4. `npm run db:migrate && npm run db:seed`
5. `npm run dev`
6. Open http://localhost:3000

## Testing

- **Auth flow:** Login → onboarding → dashboard
- **Shift lookup:** Worker sees next shift + replacement
- **Incident report:** Worker sends push → team lead receives FCM
- **Multi-tenancy:** Verify worker A (tenant 1) cannot see tenant 2 data
- **Offline:** PWA mode works for viewing cached shifts (list only)

## Key Files to Know

- `app/middleware.ts` — JWT verify, session liveness check, tenant resolve
- `lib/auth/jwt.ts` — JWT sign/verify (jose)
- `lib/auth/password.ts` — Argon2 hashing
- `lib/db/scoped-prisma.ts` — Tenant-scoped Prisma client
- `lib/he.ts` — Hebrew strings (all UI copy)
- `prisma/schema.prisma` — Data model + RLS policies
