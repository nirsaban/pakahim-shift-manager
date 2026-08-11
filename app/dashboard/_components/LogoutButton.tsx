'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { he } from '@/lib/he';
import { Button } from '../../_components/ui/Button';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <Button variant="ghost" size="md" onClick={handleLogout} className="px-2.5">
      <LogOut size={16} />
      <span className="hidden sm:inline">{he.button.logout}</span>
    </Button>
  );
}
