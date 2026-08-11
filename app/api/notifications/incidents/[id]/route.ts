import { NextRequest, NextResponse } from 'next/server';
import { updateIncidentStatusSchema } from '@/lib/validation/incidents';
import { updateIncidentStatus } from '@/lib/services/incident-service';
import { he } from '@/lib/he';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateIncidentStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: he.error.required }, { status: 400 });
  }

  const incident = await updateIncidentStatus(id, userId, parsed.data.status);
  if (!incident) {
    return NextResponse.json({ error: he.error.notFound }, { status: 404 });
  }
  return NextResponse.json({ incident });
}
