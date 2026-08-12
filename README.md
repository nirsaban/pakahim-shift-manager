# Pakahim Shift Manager 🚂

A PWA (Progressive Web App) for Israeli train workers to manage shift schedules, view team status, and report incidents in real-time.

**Brand:** Genericflow Brain  
**Status:** Early Development (MVP)

## Quick Start

### Prerequisites
- Node.js 18+ (for pnpm) or npm
- Docker & Docker Compose (for local Postgres + Redis)
- Firebase project (for push notifications)

### Setup

```bash
# 1. Clone and install
git clone <repo>
cd Pakahim-shift-manager
npm install

# 2. Create .env.local (copy from .env.example and fill in values)
cp .env.example .env.local

# 3. Start Postgres + Redis
docker compose up -d

# 4. Setup database
npm run db:push      # or: npm run db:migrate
npm run db:seed      # Load demo data

# 5. Run dev server
npm run dev
# Open http://localhost:3000
```

## Project Structure

- **`app/`** — Next.js App Router pages
  - `t/` — Tenant routes (auth, dashboard, admin)
  - `api/` — API route handlers
  - `superadmin/` — Platform admin
- **`lib/`** — Utilities & business logic
  - `auth/` — JWT, Argon2, session management
  - `db/` — Prisma client, tenant scoping
  - `validation/` — Zod schemas
  - `he.ts` — Hebrew UI strings
  - `services/` — Business logic (shifts, incidents)
- **`prisma/`** — Database schema + migrations

## User Roles

| Role | Abilities |
|------|-----------|
| **PAKAHIM** | View shifts, team status, report incidents |
| **TEAM_LEAD** | Monitor team, receive incident alerts |
| **SHIBUTZ** | Upload & manage weekly shift schedules |
| **ADMIN** | Tenant management, user admin |
| **SUPER_ADMIN** | Platform-wide admin |

## Key Features

### For Workers
- 📅 See next shift + replacement coverage
- 👥 Team status (on shift, holiday, sick day)
- 🚨 Report incidents with severity levels
- 🔔 Push notifications

### For Team Leads
- 📊 Real-time team dashboard
- 🔔 Incident notifications
- ✅ Confirm/resolve incidents
- 📞 Contact worker info

### For Admins
- 📤 Upload Excel shift schedules
- 👥 Manage teams & workers
- 📈 Analytics & coverage reports

## Architecture

- **Frontend:** Next.js 15 (App Router, TypeScript)
- **UI:** Tailwind CSS (RTL/Hebrew via logical properties)
- **Auth:** JWT + Argon2 (jose + @node-rs/argon2)
- **Database:** PostgreSQL 16 + Prisma 6 + Row-Level Security
- **Sessions:** Redis (ioredis) — sessions are ephemeral, never persisted
- **Notifications:** Firebase Cloud Messaging (FCM)
- **File Handling:** XLSX parser for shift imports

## Commands

```bash
npm run dev              # Dev server (localhost:3000)
npm run build            # Production build
npm run start            # Start production server
npm test                 # Run Vitest
npm run lint             # ESLint check
npm run db:migrate       # Create/run Prisma migrations
npm run db:push          # Push schema changes (no history)
npm run db:seed          # Seed demo data
npm run db:studio        # Open Prisma Studio
```

## Environment Variables

See `.env.example` for all required vars:
- `DATABASE_URL` — PostgreSQL connection
- `REDIS_URL` — Redis connection
- `JWT_SECRET` — Secret for JWT signing
- `FIREBASE_*` — Firebase Admin SDK credentials
- `NEXT_PUBLIC_*` — Exposed to frontend

## Development Flow

1. **Create a feature branch:** `git checkout -b feature/shift-notifications`
2. **Make changes** to code
3. **Update schema** (if needed): Edit `prisma/schema.prisma`
4. **Create migration:** `npm run db:migrate`
5. **Test locally:** `npm run dev` + manual testing
6. **Commit & push:** Follow conventional commits
7. **Open PR:** Request review from team

## Testing

- **Unit:** Vitest (no DB required, use ioredis-mock)
- **Integration:** Against real PostgreSQL (Docker)
- **End-to-End:** Manual flow testing (login → shift view → incident report)

## Security & Conventions

✅ **RTL Hebrew Always** — Use logical properties (`ms-*`, `ps-*`, `start-*`, etc.)  
✅ **No Hardcoded Strings** — All UI copy in `lib/he.ts`  
✅ **Tenant Isolation** — Scoped Prisma client enforces `tenantId` on every query  
✅ **Session Liveness** — Redis sessions verified on every auth request  
✅ **Validation at Boundaries** — Zod schemas on all API routes  
✅ **No Secrets in Repo** — Use `.env.example` + `.env.local`

See `CLAUDE.md` for detailed conventions.

## Debugging

```bash
# Prisma Studio (inspect database)
npm run db:studio

# Next.js server logs
npm run dev  # Check terminal output

# Redis connections
redis-cli KEYS "sess:*"  # See active sessions
redis-cli FLUSHDB        # Clear all (dev only!)
```

## Deployment

> Coming soon: Docker build, Vercel, or self-hosted instructions

## Support

For questions or issues, reach out to the Genericflow team.

---

**Last updated:** 2026-08-01  
**Next milestone:** MVP launch with onboarding flow + shift dashboard
