import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { he } from '@/lib/he';
import { listSwapSuggestions } from '@/lib/services/swap-service';
import { listSwapsQuerySchema, toRosterDate } from '@/lib/validation/roster';

const VIEWER_ROLES = new Set(['TEAM_LEAD', 'SHIBUTZ', 'ADMIN', 'SUPER_ADMIN']);

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role');
  if (!userId || !role) return NextResponse.json({ error: he.error.unauthorized }, { status: 401 });
  if (!VIEWER_ROLES.has(role)) return NextResponse.json({ error: he.error.forbidden }, { status: 403 });

  const params = request.nextUrl.searchParams;
  const parsed = listSwapsQuerySchema.safeParse({
    date: params.get('date') ?? '',
    kind: params.get('kind') ?? undefined,
    status: params.get('status') ?? undefined,
    limit: params.get('limit') ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: he.error.required }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { tenantId: true } });
  if (!user) return NextResponse.json({ error: he.error.unauthorized }, { status: 401 });

  const suggestions = await listSwapSuggestions({
    tenantId: user.tenantId,
    date: toRosterDate(parsed.data.date),
    kind: parsed.data.kind,
    status: parsed.data.status,
    limit: parsed.data.limit,
  });

  return NextResponse.json({ suggestions });
}
