import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Upload } from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { destroySession } from '@/lib/auth/session';
import { formatWorkerName } from '@/lib/utils/display-name';
import { formatIsraelTime } from '@/lib/time/zone';
import { relativeDayLabel } from '@/lib/driver-roster/display';
import { getDriverDirectory, getUpcomingDriverShifts } from '@/lib/services/driver-home-service';
import { he } from '@/lib/he';
import { Brand } from '../_components/Brand';
import { PageHeader } from '../_components/ui/PageHeader';
import { Button } from '../_components/ui/Button';
import { LogoutButton } from '../dashboard/_components/LogoutButton';
import { MyShifts } from './_components/MyShifts';
import { DriverDirectory, type DirectoryRow } from './_components/DriverDirectory';

/**
 * Home for a locomotive driver - only a driver session reaches it (proxy.ts).
 * Their own next shift, then the day's roster with everyone's contact details:
 * the two things drivers used to dig out of the emailed file by hand.
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

  const now = new Date();
  const [shifts, directory] = await Promise.all([
    getUpcomingDriverShifts(user.id, now),
    getDriverDirectory(user.tenantId, now),
  ]);

  // Times are formatted here, in Israel time, so the client never reads them
  // in the phone's own zone.
  const rows: DirectoryRow[] = directory.entries.map((e) => ({
    id: e.id,
    name: e.name,
    workerNumber: e.workerNumber,
    phone: e.phone,
    city: e.city,
    shift: e.shift
      ? { span: `${formatIsraelTime(e.shift.startTime)}–${formatIsraelTime(e.shift.endTime)}`, origin: e.shift.originStation }
      : null,
  }));

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

        <MyShifts shifts={shifts} now={now} />

        {user.isRosterAdmin && (
          <Link href="/drivers/upload">
            <Button variant="secondary" size="lg" className="w-full">
              <Upload size={16} />
              {he.drivers.home.uploadRoster}
            </Button>
          </Link>
        )}

        <DriverDirectory dayLabel={directory.day ? relativeDayLabel(directory.day, now) : null} rows={rows} />
      </div>
    </main>
  );
}
