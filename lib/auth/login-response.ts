import { NextResponse } from 'next/server';
import { createSession } from './session';
import { signSessionJwt } from './jwt';

const SESSION_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

interface AuthenticatedUser {
  id: string;
  role: string;
}

// Shared by /api/auth/register (first-time, no OTP needed) and
// /api/auth/otp/verify (returning users) - both end the same way: a live
// Redis session + signed JWT cookie.
export async function respondWithSession(user: AuthenticatedUser): Promise<NextResponse> {
  const sessionId = await createSession({ userId: user.id, role: user.role });
  const token = await signSessionJwt({ sessionId, userId: user.id, role: user.role });

  const response = NextResponse.json({ ok: true, role: user.role });
  response.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
  return response;
}
