import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { CalendarClock, Upload } from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { destroySession } from '@/lib/auth/session';
import { formatWorkerName } from '@/lib/utils/display-name';
import { he } from '@/lib/he';
import { Brand } from '../_components/Brand';
import { PageHeader } from '../_components/ui/PageHeader';
import { Card } from '../_components/ui/Card';
import { EmptyState } from '../_components/ui/EmptyState';
import { LogoutButton } from '../dashboard/_components/LogoutButton';

/**
 * Home for a locomotive driver. Only a driver session reaches it (proxy.ts).
 * For now it confirms the login worked; the day's roster arrives with the PDF
 * upload, see docs/modules/drivers.md.
 */
export default async function DriversHomePage() {
  const headersList = await headers();
  const userId = headersList.get('x-user-id') as string;
  const sessionId = headersList.get('x-session-id');

  // The session can outlive its user (account removed, database reset); treat
  // that as signed out rather than failing the render.
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== 'DRIVER') {
    if (sessionId) await destroySession(sessionId);
    redirect('/login');
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-10">
      <PageHeader>
        <Brand size="compact" />
        <LogoutButton />
      </PageHeader>

      <div className="flex flex-col gap-6 pt-4">
        <h1 className="text-2xl font-bold text-foreground">
          {he.drivers.home.greeting}, {formatWorkerName(user)}
        </h1>
        <Card>
          <EmptyState icon={<CalendarClock size={28} />}>{he.drivers.home.comingSoon}</EmptyState>
        </Card>
        {user.isRosterAdmin && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Upload size={14} className="shrink-0" />
            {he.drivers.home.rosterAdminNote}
          </p>
        )}
      </div>
    </main>
  );
}
