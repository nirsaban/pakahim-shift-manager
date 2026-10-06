import { NextRequest, NextResponse } from 'next/server';
import { findRosterAdmin } from '@/lib/auth/roster-admin';
import { driverFieldsSchema } from '@/lib/validation/driver-admin';
import { updateDriver } from '@/lib/services/driver-admin-service';
import { driverAdminErrorMessage, he } from '@/lib/he';

/** Fixes a driver's name, worker number, phone or city. Roster admin only. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await findRosterAdmin(request.headers.get('x-user-id'));
  if (!admin) return NextResponse.json({ error: he.error.forbidden }, { status: 403 });

  const parsed = driverFieldsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: driverAdminErrorMessage(parsed.error.issues[0]?.message) }, { status: 400 });
  }

  const result = await updateDriver(admin.tenantId, (await params).id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: driverAdminErrorMessage(result.error) }, { status: result.status });
  return NextResponse.json({ ok: true });
}
