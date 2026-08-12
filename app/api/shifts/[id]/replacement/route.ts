import { NextRequest, NextResponse } from 'next/server';
import { assignReplacementSchema } from '@/lib/validation/coverage';
import { assignReplacement } from '@/lib/services/coverage-service';
import { he, coverageErrorMessage } from '@/lib/he';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: he.error.unauthorized }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = assignReplacementSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: he.error.required }, { status: 400 });

  const result = await assignReplacement(id, parsed.data.replacementId, userId);
  if (!result.ok) {
    return NextResponse.json({ error: coverageErrorMessage(result.error) }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
