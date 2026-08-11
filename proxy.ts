import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionJwt } from './lib/auth/jwt';
import { isSessionLive } from './lib/auth/session';

const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/api/auth/lookup',
  '/api/auth/register',
  '/api/auth/otp/verify',
  '/api/auth/logout',
  '/discovery.html',
  '/api/discovery',
]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('session')?.value;
  const payload = token ? await verifySessionJwt(token) : null;
  const live = payload ? await isSessionLive(payload.sessionId) : false;

  if (!payload || !live) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('session');
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-role', payload.role);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
