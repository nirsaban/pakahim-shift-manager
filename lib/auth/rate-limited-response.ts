import { NextResponse } from 'next/server';
import { he } from '../he';
import type { RateLimitResult } from './rate-limit';

/**
 * The 429 for a caller over its rate limit. `reason` lets the login page tell
 * this apart from an OTP cooldown: on a cooldown a code really was just sent,
 * here nothing was.
 */
export function rateLimitedResponse(limit: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: he.auth.tooManyAttempts, reason: 'rate_limited' },
    { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
  );
}
