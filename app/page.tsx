import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySessionJwt } from '@/lib/auth/jwt';
import { isSessionLive } from '@/lib/auth/session';

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const payload = token ? await verifySessionJwt(token) : null;

  if (payload && (await isSessionLive(payload.sessionId))) {
    redirect('/dashboard');
  }

  redirect('/login');
}
