import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { whatsapp } from '@/lib/whatsapp/service';
import { he } from '@/lib/he';

/**
 * Admin control surface for the outbound WhatsApp connection.
 *
 * GET reports live state (and renders the pairing QR); POST drives it. The
 * pairing screen polls GET every couple of seconds, because Baileys rotates the
 * QR roughly every 20s and pushes status changes asynchronously - there is no
 * request/response moment at which "connected" can simply be returned.
 */

// Pairing this number is the same power as sending as the organisation, so it
// is deliberately narrower than the upload routes' SHIBUTZ-and-up.
const ALLOWED_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

function forbidden() {
  return NextResponse.json({ error: he.error.forbidden }, { status: 403 });
}

/** The proxy has already authenticated the session and stamped these headers. */
function isAdmin(request: NextRequest): boolean {
  const role = request.headers.get('x-user-role');
  return !!role && ALLOWED_ROLES.has(role);
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return forbidden();

  const state = await whatsapp.state();

  // The raw QR payload is useless to a browser; turn it into an image here so
  // the client needs no QR library of its own.
  const qrImage = state.qr
    ? await QRCode.toDataURL(state.qr, { margin: 1, width: 320 }).catch(() => null)
    : null;

  return NextResponse.json({
    status: state.status,
    phoneNumber: state.phoneNumber,
    qrImage,
  });
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return forbidden();

  const body = await request.json().catch(() => null);
  const action = (body as { action?: string } | null)?.action;

  if (action === 'connect') {
    // Deliberately not awaited to completion beyond socket setup: pairing ends
    // when a human scans, which is far longer than a request should live. The
    // QR arrives via the polled GET.
    await whatsapp.connect();
    return NextResponse.json({ ok: true });
  }

  if (action === 'logout') {
    await whatsapp.logout();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: he.error.required }, { status: 400 });
}
