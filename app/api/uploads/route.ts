import { NextRequest, NextResponse } from 'next/server';
import { getDefaultTenantId } from '@/lib/db/tenant';
import { importShiftFile } from '@/lib/services/upload-service';
import { he } from '@/lib/he';

const ALLOWED_ROLES = new Set(['SHIBUTZ', 'ADMIN', 'SUPER_ADMIN']);

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const role = request.headers.get('x-user-role');
  if (!userId || !role || !ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: he.error.forbidden }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: he.error.required }, { status: 400 });
  }

  const tenantId = await getDefaultTenantId();
  const buffer = Buffer.from(await file.arrayBuffer());
  const confirmClearCoverage = formData.get('confirmClearCoverage') === 'true';

  const result = await importShiftFile({
    tenantId,
    uploadedBy: userId,
    filename: file.name,
    buffer,
    confirmClearCoverage,
  });

  if (result.needsConfirmation) {
    return NextResponse.json(
      {
        needsConfirmation: true,
        activeCoverageCount: result.activeCoverageCount,
        coverageByDate: result.coverageByDate,
      },
      { status: 409 },
    );
  }
  if (result.status === 'FAILED') {
    return NextResponse.json({ error: result.errorMessage }, { status: 422 });
  }
  return NextResponse.json({
    ok: true,
    importedCount: result.importedCount,
    skippedCount: result.skippedCount,
    // One upload can cover several roster dates; the admin needs to see that each
    // day they expected actually landed, not just a single total.
    days: result.days,
  });
}
