import Link from 'next/link';
import { ArrowRight, Bell, Settings } from 'lucide-react';
import { he } from '@/lib/he';
import { Brand } from '../../_components/Brand';
import { PageHeader } from '../../_components/ui/PageHeader';
import { Button } from '../../_components/ui/Button';
import { LogoutButton } from '../../dashboard/_components/LogoutButton';

/**
 * The drivers' page header. On the home page it carries settings, the install
 * guide and logout, as the פקחים dashboard does; on inner pages, a way back.
 */
export function DriverHeader({ back }: { back?: boolean }) {
  return (
    <PageHeader>
      <Brand size="compact" />
      {back ? (
        <Link href="/drivers">
          <Button variant="ghost" size="md">
            <ArrowRight size={15} />
            {he.drivers.admin.backHome}
          </Button>
        </Link>
      ) : (
        <div className="flex items-center gap-3">
          <Link href="/settings" aria-label={he.settings.open} title={he.settings.open}>
            <Button variant="secondary" size="md">
              <Settings size={15} />
            </Button>
          </Link>
          <Link href="/install" aria-label={he.pwa.openInstallGuide} title={he.pwa.openInstallGuide}>
            <Button variant="secondary" size="md">
              <Bell size={15} />
            </Button>
          </Link>
          <LogoutButton />
        </div>
      )}
    </PageHeader>
  );
}
