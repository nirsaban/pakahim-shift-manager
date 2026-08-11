import { NextRequest, NextResponse } from 'next/server';
import { createIncidentSchema } from '@/lib/validation/incidents';
import { createIncident, listIncidentsForUser } from '@/lib/services/incident-service';
import { he } from '@/lib/he';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const incidents = await listIncidentsForUser(userId);
  return NextResponse.json({ incidents });
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createIncidentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: he.error.required }, { status: 400 });
  }

  try {
    const { incident, teamLeadContact } = await createIncident(userId, parsed.data);
    return NextResponse.json({ incident, teamLeadContact });
  } catch {
    return NextResponse.json({ error: he.error.serverError }, { status: 500 });
  }
}
