import { NextResponse } from 'next/server';
import { getVapidPublicKey } from '@/lib/services/push-service';

/** The browser needs the VAPID public key to create a subscription. */
export async function GET() {
  const publicKey = getVapidPublicKey();
  return NextResponse.json({ publicKey, enabled: Boolean(publicKey) });
}
