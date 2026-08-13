import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { he } from '@/lib/he';
import { updateReminderSettingsSchema } from '@/lib/validation/profile';

/**
 * A worker's own pre-shift reminder settings: on/off, how long before, which
 * tone. Read by the scheduler's sweep, never by another worker.
 */
export async function PATCH(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: he.error.unauthorized }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = updateReminderSettingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: he.error.required }, { status: 400 });

  const { enabled, leadMinutes, sound } = parsed.data;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      shiftReminderEnabled: enabled,
      shiftReminderLeadMinutes: leadMinutes,
      shiftReminderSound: sound as 'CHIME' | 'BELL' | 'ALARM' | 'SILENT',
    },
    select: {
      shiftReminderEnabled: true,
      shiftReminderLeadMinutes: true,
      shiftReminderSound: true,
    },
  });

  return NextResponse.json({ ok: true, settings: user });
}
