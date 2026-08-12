# Screen: Login & onboarding

`app/login/page.tsx` — route `/login`. Public (the one screen reachable without a
session; gated out of `proxy.ts`'s auth check).

## Purpose

The single entry point for every role. No separate "sign up" screen — registration is a
step inside this same flow, triggered automatically when a worker number is recognized
but has no contact info yet (i.e. every worker the Excel importer auto-created — see
`excel-import.md`).

## Data used

`User` (lookup by `workerNumber`, then update on self-registration). No `Team`/`Shift`
data touched here. See `data-model.md`.

## States

1. **Worker-number entry** (default) — one input, `workerNumber`, submit.
2. **Registration** — shown only when the looked-up user has no `email`. Pre-fills
   `firstName`/`lastName` from whatever the Excel import stored (usually the full name
   sitting in `firstName` alone — see `excel-import.md`), lets the worker correct the
   split and fill in `city`, `email`, `phone`.
3. **OTP entry** — 6-digit code, shown after either path above successfully triggers a
   send. A 429 from the lookup/register call (already-on-cooldown) is treated as "OTP
   already sent, show the entry step" rather than an error — a deliberate UX choice so
   double-submitting doesn't dead-end the user.
4. **Error** — inline message, `he.error.*` strings; network failures show
   `he.error.networkError` (a real message that surfaced as "בעיית חיבור" in production
   during this session — see the accompanying gap: it fires for *any* thrown/rejected
   fetch, including unrelated server errors like a missing tenant row, not just true
   network issues. Worth narrowing before this is trusted for user-facing debugging.)

## Actions & side effects

- Submit worker number → `POST /api/auth/lookup` → routes to step 2 or 3.
- Submit registration → `POST /api/auth/register` → sets contact info, then same OTP send
  as lookup.
- Submit OTP → `POST /api/auth/otp/verify` → creates session (cookie), redirect to
  `/dashboard`.

## Permissions

None — pre-auth by definition. Every role logs in through this identical flow; the
dashboard they land on (see `worker-dashboard.md`, `team-lead-dashboard.md`, etc.)
branches by `role` after session creation.

## Open questions

- No forgot-password/lost-access path exists (expected — there's no password), but there's
  also no "my worker number isn't in the system" recovery path for a genuinely new hire
  who hasn't appeared in any roster upload yet. Currently that person simply can't log in
  at all until an Excel upload creates their `User` row. Worth confirming this matches the
  client's actual onboarding order (upload always precedes first login) before treating it
  as acceptable.
