import { NextRequest, NextResponse } from 'next/server';
import { he, swapErrorMessage } from '@/lib/he';
import { convertSwapSuggestion, dismissSwapSuggestion } from '@/lib/services/swap-service';
import { swapActionSchema } from '@/lib/validation/roster';

// Same authority set the coverage flow uses for cross-team decisions. A swap
// only ever produces a CoverageRequest, which the team lead still approves.
const DECIDER_ROLES = new Set(['TEAM_LEAD', 'SHIBUTZ', 'ADMIN', 'SUPER_ADMIN']);

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role');
  if (!userId || !role) return NextResponse.json({ error: he.error.unauthorized }, { status: 401 });
  if (!DECIDER_ROLES.has(role)) return NextResponse.json({ error: he.error.forbidden }, { status: 403 });

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = swapActionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: he.error.required }, { status: 400 });

  if (parsed.data.action === 'DISMISS') {
    const result = await dismissSwapSuggestion(id, userId);
    if (!result.ok) {
      return NextResponse.json({ error: swapErrorMessage(result.error) }, { status: result.status });
    }
    return NextResponse.json({ status: 'DISMISSED' });
  }

  const result = await convertSwapSuggestion(id, parsed.data.side, userId, parsed.data.note);
  if (!result.ok) {
    return NextResponse.json({ error: swapErrorMessage(result.error) }, { status: result.status });
  }
  return NextResponse.json({ status: 'CONVERTED', coverageRequestId: result.data.coverageRequestId });
}
