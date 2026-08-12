import { NextRequest, NextResponse } from 'next/server';
import { getDefaultTenantId } from '@/lib/db/tenant';
import { createTeamSchema } from '@/lib/validation/admin';
import { createTeam, listTeams } from '@/lib/services/admin-service';
import { he, adminErrorMessage } from '@/lib/he';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

export async function GET(request: NextRequest) {
  const role = request.headers.get('x-user-role');
  if (!role || !ADMIN_ROLES.has(role)) return NextResponse.json({ error: he.error.forbidden }, { status: 403 });

  const tenantId = await getDefaultTenantId();
  const teams = await listTeams(tenantId);
  return NextResponse.json({ teams });
}

export async function POST(request: NextRequest) {
  const role = request.headers.get('x-user-role');
  if (!role || !ADMIN_ROLES.has(role)) return NextResponse.json({ error: he.error.forbidden }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = createTeamSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: he.error.required }, { status: 400 });

  const tenantId = await getDefaultTenantId();
  const result = await createTeam(tenantId, parsed.data);
  if (!result.ok) return NextResponse.json({ error: adminErrorMessage(result.error) }, { status: result.status });
  return NextResponse.json({ id: result.data.id });
}
