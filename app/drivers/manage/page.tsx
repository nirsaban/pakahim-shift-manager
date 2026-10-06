import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { findRosterAdmin } from '@/lib/auth/roster-admin';
import { listDrivers } from '@/lib/services/driver-admin-service';
import { he } from '@/lib/he';
import { DriverHeader } from '../_components/DriverHeader';
import { DriversPanel } from './_components/DriversPanel';

/**
 * The roster admin's driver list - the drivers' counterpart of /admin/manage.
 * Mostly for the drivers who cannot log in yet: on the roster but not in the
 * contact list (no phone), or in the list with no worker number.
 */
export default async function DriversManagePage() {
  const admin = await findRosterAdmin((await headers()).get('x-user-id'));
  if (!admin) redirect('/drivers');

  const drivers = await listDrivers(admin.tenantId);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-10">
      <DriverHeader back />
      <div className="flex flex-col gap-2 pt-4 pb-6">
        <h1 className="text-2xl font-bold text-foreground">{he.drivers.manage.title}</h1>
        <p className="text-sm text-muted">{he.drivers.manage.subtitle}</p>
      </div>
      <DriversPanel drivers={drivers} />
    </main>
  );
}
