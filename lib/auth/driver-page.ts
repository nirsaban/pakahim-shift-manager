import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '../db/prisma';
import { destroySession } from './session';

/**
 * The signed-in driver, for a drivers' page. The proxy already keeps other
 * sessions out of /drivers; this also signs out a session whose user is gone
 * (deleted, database reset) instead of failing the render.
 */
export async function requireDriver() {
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const sessionId = headersList.get('x-session-id');
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  if (!user || user.role !== 'DRIVER') {
    if (sessionId) await destroySession(sessionId);
    redirect('/login');
  }
  return user;
}
