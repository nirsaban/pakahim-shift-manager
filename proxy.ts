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
  // Install instructions must be readable before logging in - a worker being
  // told "install the app first" has not necessarily signed in yet.
  '/install',
  // The VAPID public key is public by definition; it is the identifier the
  // browser needs to build a subscription.
  '/api/push/vapid-public-key',
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
  // The PWA assets MUST stay outside the auth check. A service worker is only
  // registered if /sw.js returns the script itself - a 307 to /login silently
  // disables push for everyone, and the manifest/icons must resolve for the
  // browser to offer "add to home screen" at all.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|.*\\.png$|.*\\.svg$|.*\\.ico$).*)',
  ],
};
