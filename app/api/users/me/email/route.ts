import { NextRequest, NextResponse } from 'next/server';
import { he } from '@/lib/he';
import { callerIp, rateLimit } from '@/lib/auth/rate-limit';
import { confirmEmailChange, requestEmailChange } from '@/lib/services/email-change-service';
import { confirmEmailChangeSchema, requestEmailChangeSchema } from '@/lib/validation/profile';

/**
 * Two steps, because this changes where login codes go.
 *
 * POST asks for the change and sends a code to the new address; PATCH confirms
 * it. Nothing about the account moves until the code comes back, so a live
 * session alone cannot redirect a worker's login codes to somewhere else.
 */

/** Enough for a typo and a retry; useless for spraying codes at addresses. */
const REQUEST_LIMIT = 5;
const CONFIRM_LIMIT = 10;
const WINDOW_SECONDS = 15 * 60;

function errorMessage(code: string): string {
  return (he.settings.errors as Record<string, string>)[code] ?? he.error.serverError;
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: he.error.unauthorized }, { status: 401 });

  // Keyed on the user, not the IP: the caller is authenticated, so the account
  // is the thing worth limiting, and a shared depot IP must not lock out a
  // whole team because one of them is retyping their address.
  const limit = await rateLimit('email-change', `${userId}:${callerIp(request)}`, REQUEST_LIMIT, WINDOW_SECONDS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: he.settings.errors.email_change_rate_limited },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = requestEmailChangeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: he.settings.errors.invalid_email }, { status: 400 });

  const result = await requestEmailChange(userId, parsed.data.email);
  if (!result.ok) return NextResponse.json({ error: errorMessage(result.error) }, { status: 400 });

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: he.error.unauthorized }, { status: 401 });

  const limit = await rateLimit('email-confirm', `${userId}:${callerIp(request)}`, CONFIRM_LIMIT, WINDOW_SECONDS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: he.settings.errors.email_change_rate_limited },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = confirmEmailChangeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: he.settings.errors.invalid_code }, { status: 400 });

  const result = await confirmEmailChange(userId, parsed.data.email, parsed.data.code);
  if (!result.ok) return NextResponse.json({ error: errorMessage(result.error) }, { status: 400 });

  return NextResponse.json({ ok: true, email: result.email });
}
