import { NextRequest, NextResponse } from 'next/server';
import { he } from '@/lib/he';
import { removeSubscription, saveSubscription } from '@/lib/services/push-service';
import { pushSubscriptionSchema, pushUnsubscribeSchema } from '@/lib/validation/push';

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: he.error.unauthorized }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = pushSubscriptionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: he.error.required }, { status: 400 });

  await saveSubscription(userId, parsed.data, request.headers.get('user-agent') ?? undefined);
  return NextResponse.json({ subscribed: true });
}

export async function DELETE(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: he.error.unauthorized }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = pushUnsubscribeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: he.error.required }, { status: 400 });

  await removeSubscription(userId, parsed.data.endpoint);
  return NextResponse.json({ subscribed: false });
}
