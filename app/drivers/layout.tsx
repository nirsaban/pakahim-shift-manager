import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { isDriversAdmin } from '@/lib/auth/roles';
import { DriverTabBar } from './_components/DriverTabBar';

/**
 * Every drivers' page: the page itself, then the tab bar fixed at the bottom.
 * Each page still checks its own access; this only decides the last tab.
 */
export default async function DriversLayout({ children }: { children: ReactNode }) {
  const userId = (await headers()).get('x-user-id');
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { role: true, isRosterAdmin: true } })
    : null;

  return (
    <>
      {/* Room for the tab bar, so the last card is never hidden under it. */}
      <div className="flex flex-1 flex-col pb-24">{children}</div>
      {user?.role === 'DRIVER' && <DriverTabBar admin={isDriversAdmin(user)} />}
    </>
  );
}
