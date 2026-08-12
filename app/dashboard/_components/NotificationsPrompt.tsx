'use client';

import Link from 'next/link';
import { BellRing } from 'lucide-react';
import { he } from '@/lib/he';
import { usePushNotifications } from '@/lib/hooks/usePushNotifications';
import { Button } from '../../_components/ui/Button';

/**
 * Notifications are treated as required, not optional.
 *
 * The roster changes during the day. A worker without notifications finds out
 * about a changed shift, an approved swap or a reported fault only if they
 * happen to reopen the app — which is exactly the "בלאגן" this system exists to
 * replace. So this banner has no dismiss control: it stays until notifications
 * are actually on.
 *
 * It only offers the in-place button where that can work. On an un-installed
 * iOS browser Safari does not expose PushManager at all, so it links to
 * /install instead of showing a button that cannot succeed.
 */
export function NotificationsPrompt() {
  const push = usePushNotifications();

  if (push.isLoading || push.isSubscribed) return null;
  // Nothing actionable to offer on a browser that cannot do push at all.
  if (!push.isSupported && !push.needsInstallFirst) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-warning-fg/25 bg-warning-bg px-4 py-3 text-warning-fg">
      <div className="flex items-start gap-3">
        <BellRing size={18} className="mt-0.5 shrink-0" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-bold">{he.pwa.requiredTitle}</p>
          <p className="text-sm">
            {push.needsInstallFirst ? he.pwa.installFirst : he.pwa.requiredBody}
          </p>
        </div>
      </div>

      {push.needsInstallFirst ? (
        <Link href="/install" className="w-full">
          <Button size="lg" className="w-full">
            {he.pwa.openInstallGuide}
          </Button>
        </Link>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="lg" className="flex-1" disabled={push.isBusy} onClick={push.subscribe}>
            <BellRing size={17} />
            {he.pwa.enable}
          </Button>
          <Link href="/install">
            <Button variant="secondary" size="lg">
              {he.pwa.openInstallGuide}
            </Button>
          </Link>
        </div>
      )}

      {push.error === 'permission_denied' && <p className="text-sm">{he.pwa.permissionDenied}</p>}
      {push.error === 'not_signed_in' && <p className="text-sm">{he.pwa.signInFirst}</p>}
      {push.error === 'push_not_configured' && <p className="text-sm">{he.pwa.notConfigured}</p>}
    </div>
  );
}
