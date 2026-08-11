import { NextRequest, NextResponse } from 'next/server';
import { verifySessionJwt } from '@/lib/auth/jwt';
import { destroySession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  if (token) {
    const payload = await verifySessionJwt(token);
    if (payload) await destroySession(payload.sessionId);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete('session');
  return response;
}
