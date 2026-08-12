import { NextRequest, NextResponse } from 'next/server';
import { updateTeamSchema } from '@/lib/validation/admin';
import { updateTeam } from '@/lib/services/admin-service';
import { he, adminErrorMessage } from '@/lib/he';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = request.headers.get('x-user-role');
  if (!role || !ADMIN_ROLES.has(role)) return NextResponse.json({ error: he.error.forbidden }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateTeamSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: he.error.required }, { status: 400 });

  const result = await updateTeam(id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: adminErrorMessage(result.error) }, { status: result.status });
  return NextResponse.json({ ok: true });
}
