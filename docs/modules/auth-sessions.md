# Module: Auth & sessions

Fully implemented today; documented here for completeness and because every new screen
in this redesign (`request-coverage.md`, `coverage-approvals.md`) sits behind it
unchanged — no auth changes needed for this pass.

## The auth boundary: `proxy.ts`

Next.js 16 renamed `middleware.ts` → `proxy.ts` (root-level, exports a `proxy` function,
runs on the Node.js runtime by default — not Edge, which is why `ioredis`/`jose` work
inside it). This is the single choke point for every request:

```
1. Public paths (login, OTP endpoints, root redirect gate) pass through untouched.
2. Read the `session` cookie → verify as a JWT (jose) → get {userId, role, sessionId}.
3. Check Redis: EXISTS sess:{sessionId}. JWT validity alone is never trusted — the
   session must also still be live in Redis (see "why both" below).
4. If either check fails: 401 for API routes, redirect-to-/login (clearing the cookie)
   for pages.
5. If both pass: inject x-user-id / x-user-role request headers, forward the request.
   Every API route and server component downstream reads identity from these headers,
   never from the cookie/JWT directly.
```

## Why both a JWT and a Redis liveness check

JWT alone can't be revoked before expiry (logout, or an admin forcing a session dead
would do nothing to an already-issued token). Redis is the actual source of truth for
"is this session still alive right now" — `sess:{sessionId}` existing in Redis is what
logout deletes. The JWT is just transport: it proves *who* without a DB round-trip, but
never proves *still logged in* on its own.

## Login flow (worker-number-first, OTP-only)

No passwords in the current build (`password` field exists on `User` but is unused).

```
1. POST /api/auth/lookup {workerNumber}
   → user not found: 404
   → user found, no email: {status: needs_registration, firstName, lastName}
   → user found, has email: send OTP to that email (Redis-backed, 5 min TTL,
     60s resend cooldown, 5 wrong-attempt cap — see requestOtp/verifyOtp in lib/auth/otp.ts),
     {status: otp_sent}
2. (if needs_registration) POST /api/auth/register {workerNumber, firstName, lastName,
   city, email, phone} → sets the user's contact info, then proceeds to OTP like above.
3. POST /api/auth/otp/verify {workerNumber, otp} → on success, creates a session
   (Redis + signed cookie) and the client redirects to /dashboard.
```

`DEV_FALLBACK_OTP = "123456"` always verifies when `NODE_ENV !== "production"` — disabled
automatically in the deployed image, real OTP delivery is required in production.

## What this redesign needs from this module: nothing new

Every new API route this pass adds (`POST /api/coverage-requests`, `GET
/api/coverage-requests`, `PATCH /api/coverage-requests/[id]`, `PATCH
/api/shifts/[id]/replacement`) sits behind `proxy.ts` automatically — they're not in
`PUBLIC_PATHS`, so they're protected by default with zero extra wiring. Permission checks
beyond "authenticated" (e.g. "is this user the shift's team lead") happen inside each
route handler, same pattern as the existing incident routes.

## Open question

None for auth itself — this module needs no changes. The open question flagged in
`roles-permissions.md` (is "פטיש" a distinct role) is a `roles-permissions.md` /
`data-model.md` concern, not an auth-mechanism one; whichever way it resolves, the same
JWT+Redis+header pattern applies unchanged.
