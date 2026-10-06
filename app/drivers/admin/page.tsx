import { redirect } from 'next/navigation';
import { requireDriver } from '@/lib/auth/driver-page';
import { isDriversAdmin } from '@/lib/auth/roles';
import { he } from '@/lib/he';
import { DriverHeader } from '../_components/DriverHeader';
import { DriverAdminNav } from '../_components/DriverAdminNav';

/** The roster admin's tools, as a tab of their own. */
export default async function DriverAdminPage() {
  const user = await requireDriver();
  if (!isDriversAdmin(user)) redirect('/drivers');
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6">
      <DriverHeader />
      <div className="flex flex-col gap-4 pt-4">
        <h1 className="text-2xl font-bold text-foreground">{he.drivers.adminPage.title}</h1>
        <DriverAdminNav />
      </div>
    </main>
  );
}
