import { NextRequest, NextResponse } from 'next/server';
import { decideCoverageRequestSchema, cancelCoverageRequestSchema } from '@/lib/validation/coverage';
import { cancelCoverageRequest, decideCoverageRequest } from '@/lib/services/coverage-service';
import { he, coverageErrorMessage } from '@/lib/he';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: he.error.unauthorized }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (body?.decision === 'CANCEL') {
    const parsed = cancelCoverageRequestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: he.error.required }, { status: 400 });
    const result = await cancelCoverageRequest(id, userId);
    if (!result.ok) {
      return NextResponse.json({ error: coverageErrorMessage(result.error) }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  }

  const parsed = decideCoverageRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: he.error.required }, { status: 400 });

  const result = await decideCoverageRequest(id, userId, parsed.data.decision, {
    replacementId: parsed.data.decision === 'APPROVE' ? parsed.data.replacementId : undefined,
    decisionNote: parsed.data.decisionNote,
  });
  if (!result.ok) {
    return NextResponse.json({ error: coverageErrorMessage(result.error) }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
