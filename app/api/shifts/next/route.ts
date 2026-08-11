import { NextRequest, NextResponse } from 'next/server';
import { getNextShift } from '@/lib/services/shift-service';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const result = await getNextShift(userId);
  return NextResponse.json({ next: result });
}
