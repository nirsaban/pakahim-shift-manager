import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { destroySession } from '@/lib/auth/session';
import { he } from '@/lib/he';
import type { ReminderSound } from '@/lib/notifications/reminder-rules';
import { Brand } from '../_components/Brand';
import { PageHeader } from '../_components/ui/PageHeader';
import { Button } from '../_components/ui/Button';
import { ProfileForm } from './_components/ProfileForm';
import { EmailChangeForm } from './_components/EmailChangeForm';
import { ReminderSettingsForm } from './_components/ReminderSettingsForm';

/**
 * The personal area — every role has one.
 *
 * Two things live here: the details other people need to reach this person, and
 * their control over the pre-shift reminder. Both are strictly about the signed-
 * in user; nothing on this page can read or write anyone else's record.
 */
export default async function SettingsPage() {
  const headersList = await headers();
  const userId = headersList.get('x-user-id') as string;
  const sessionId = headersList.get('x-session-id');

  // Same stale-session guard as the dashboard: a live Redis session can outlive
  // the user row it points at, and throwing here would 500 rather than sign out.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      phone: true,
      city: true,
      workerNumber: true,
      email: true,
      shiftReminderEnabled: true,
      shiftReminderLeadMinutes: true,
      shiftReminderSound: true,
    },
  });
  if (!user) {
    if (sessionId) await destroySession(sessionId);
    redirect('/login');
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-10">
      <PageHeader>
        <Brand size="compact" />
        <Link href="/dashboard">
          <Button variant="secondary" size="md">
            <ArrowRight size={15} />
            {he.button.back}
          </Button>
        </Link>
      </PageHeader>

      <div className="flex flex-col gap-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{he.settings.title}</h1>
          <p className="mt-1 text-sm text-muted">{he.settings.subtitle}</p>
        </div>

        <ProfileForm
          initial={{
            firstName: user.firstName ?? '',
            lastName: user.lastName ?? '',
            phone: user.phone ?? '',
            city: user.city ?? '',
            workerNumber: user.workerNumber,
          }}
        />

        <EmailChangeForm current={user.email} />

        <ReminderSettingsForm
          initial={{
            enabled: user.shiftReminderEnabled,
            leadMinutes: user.shiftReminderLeadMinutes,
            sound: user.shiftReminderSound as ReminderSound,
          }}
        />
      </div>
    </main>
  );
}
