import type { NextRequest } from 'next/server';
import { redis } from '../redis';

/**
 * Fixed-window per-caller rate limiting for the unauthenticated auth endpoints.
 *
 * `/api/auth/lookup` answers three distinguishable things about any worker
 * number - unknown, registered, or registered-but-unclaimed - which makes it an
 * enumeration oracle for the roster. It cannot be made silent without breaking
 * the login flow it exists to drive, so the defence is cost: a handful of
 * probes a minute is fine for a human logging in and useless for sweeping a
 * few hundred worker numbers.
 *
 * A fixed window (rather than a sliding log) is deliberate - one INCR plus a
 * conditional EXPIRE, no per-request set arithmetic, and the imprecision at
 * window boundaries does not matter at this granularity.
 */

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the current window resets - surfaced as Retry-After. */
  retryAfter: number;
}

/**
 * The caller's address, trusting `x-forwarded-for` because real traffic only
 * arrives through the yogev-nginx reverse proxy - the app publishes no host
 * ports (see docker-compose.prod.yml). The left-most hop is the client as nginx
 * saw it.
 *
 * The header is spoofable by anything already inside the shared
 * miltech-association-net docker network, which would let such a caller evade
 * this limit. That is accepted: an attacker with a foothold on that network has
 * better options than enumerating worker numbers, and the OTP requirement -
 * not this - is what actually protects the accounts.
 */
export function callerIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  if (first) return first;
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export async function rateLimit(
  bucket: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const key = `rl:${bucket}:${identifier}`;

  let count: number;
  try {
    count = await redis.incr(key);
    // Only the request that opened the window sets its lifetime, so a burst
    // cannot keep pushing the expiry out and hold the window open forever.
    if (count === 1) await redis.expire(key, windowSeconds);
  } catch (err) {
    // Redis is already a hard dependency for sessions, so it being down is not
    // survivable anyway - but failing open here specifically would silently
    // remove the limit at the worst moment. Fail closed and let the caller 429.
    console.error('[rate-limit] redis error, failing closed:', err);
    return { ok: false, retryAfter: windowSeconds };
  }

  if (count <= limit) return { ok: true, retryAfter: 0 };

  const ttl = await redis.ttl(key).catch(() => windowSeconds);
  return { ok: false, retryAfter: ttl > 0 ? ttl : windowSeconds };
}
