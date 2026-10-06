import { NextRequest, NextResponse } from 'next/server';
import { findRosterAdmin } from '@/lib/auth/roster-admin';
import { importRosterFile } from '@/lib/services/driver-roster-service';
import { he } from '@/lib/he';

/**
 * Previews (publish=false) or publishes (publish=true) a drivers' roster PDF -
 * the daily report or the weekly link report, recognised from the file.
 * Roster admin only.
 */

// The real report is ~400KB; anything far beyond that is not one.
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const admin = await findRosterAdmin(request.headers.get('x-user-id'));
  if (!admin) return NextResponse.json({ error: he.error.forbidden }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: he.error.required }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: he.drivers.upload.errors.tooLarge }, { status: 413 });

  const data = new Uint8Array(await file.arrayBuffer());
  // Checked by content, not by name or declared type, before the PDF reader sees it.
  if (new TextDecoder().decode(data.subarray(0, 5)) !== '%PDF-') {
    return NextResponse.json({ error: he.drivers.upload.errors.notPdf }, { status: 400 });
  }

  const result = await importRosterFile({
    tenantId: admin.tenantId,
    uploadedBy: admin.id,
    filename: file.name,
    data,
    publish: form?.get('publish') === 'true',
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });
  return NextResponse.json(result.summary);
}
