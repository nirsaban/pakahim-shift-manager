import { NextRequest, NextResponse } from 'next/server';
import { getDefaultTenantId } from '@/lib/db/tenant';
import { createWorkerSchema } from '@/lib/validation/admin';
import { createWorker, listWorkers } from '@/lib/services/admin-service';
import { he, adminErrorMessage } from '@/lib/he';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

export async function GET(request: NextRequest) {
  const role = request.headers.get('x-user-role');
  if (!role || !ADMIN_ROLES.has(role)) return NextResponse.json({ error: he.error.forbidden }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const tenantId = await getDefaultTenantId();
  const workers = await listWorkers(tenantId, {
    search: searchParams.get('search') ?? undefined,
    role: searchParams.get('role') ?? undefined,
    teamId: searchParams.get('teamId') ?? undefined,
  });
  return NextResponse.json({ workers });
}

export async function POST(request: NextRequest) {
  const role = request.headers.get('x-user-role');
  if (!role || !ADMIN_ROLES.has(role)) return NextResponse.json({ error: he.error.forbidden }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = createWorkerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: he.error.required }, { status: 400 });

  const tenantId = await getDefaultTenantId();
  const result = await createWorker(tenantId, parsed.data);
  if (!result.ok) return NextResponse.json({ error: adminErrorMessage(result.error) }, { status: result.status });
  return NextResponse.json({ id: result.data.id });
}
