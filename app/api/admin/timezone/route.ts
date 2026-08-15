import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { diagnoseTimezone, repairTimezone } from '@/lib/services/timezone-repair-service';

// Reads and rewrites roster times across the whole tenant, so it is closed to
// everyone below an admin - deliberately narrower than the upload routes, which
// SHIBUTZ can reach.
const ALLOWED_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

async function guard(): Promise<boolean> {
  const role = (await headers()).get('x-user-role') ?? '';
  return ALLOWED_ROLES.has(role);
}

export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  return NextResponse.json(await diagnoseTimezone());
}

export async function POST() {
  if (!(await guard())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  return NextResponse.json(await repairTimezone());
}
