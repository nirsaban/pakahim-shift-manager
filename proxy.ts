import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionJwt } from './lib/auth/jwt';
import { isSessionLive } from './lib/auth/session';
import { canAccessPath, homePathFor } from './lib/auth/workforce';

const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/api/auth/lookup',
  '/api/auth/register',
  '/api/auth/otp/verify',
  '/api/auth/logout',
  // Locomotive drivers' login - the counterpart of the four above.
  '/api/drivers/auth/worker-number',
  '/api/drivers/auth/register',
  '/api/drivers/auth/phone',
  '/api/drivers/auth/verify',
  '/discovery.html',
  '/api/discovery',
  // Install instructions must be readable before logging in - a worker being
  // told "install the app first" has not necessarily signed in yet.
  '/install',
  // Public marketing page - the whole point is to be readable by people who
  // have no account yet.
  '/about',
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

  // Each workforce (פקחים / locomotive drivers) is confined to its own half of
  // the app. A page request is sent home rather than shown an error - the
  // common case is a bookmark or a push link from the other app.
  if (!canAccessPath(pathname, payload.workforce)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    return NextResponse.redirect(new URL(homePathFor(payload.workforce), request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);
  // Routes need this to tear down a session whose user no longer exists - the
  // liveness check above proves the session is valid, not that the account
  // still is.
  requestHeaders.set('x-session-id', payload.sessionId);
  requestHeaders.set('x-user-role', payload.role);
  requestHeaders.set('x-workforce', payload.workforce);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // The PWA assets MUST stay outside the auth check. A service worker is only
  // registered if /sw.js returns the script itself - a 307 to /login silently
  // disables push for everyone, and the manifest/icons must resolve for the
  // browser to offer "add to home screen" at all.
  //
  // The alert tones are here for the same reason: a media fetch that arrives
  // without the session cookie would get a 307 to an HTML login page, and the
  // only symptom would be a reminder that made no sound - the exact failure
  // this feature cannot afford. They are three generated tones, carrying
  // nothing worth gating.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|sounds/|.*\\.png$|.*\\.svg$|.*\\.ico$).*)',
  ],
};
