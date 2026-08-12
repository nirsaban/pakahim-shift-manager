'use client';

import { useEffect, useState } from 'react';
import { Apple, Bell, BellOff, CheckCircle2, Download, Monitor, Smartphone } from 'lucide-react';
import { he } from '@/lib/he';
import { usePushNotifications } from '@/lib/hooks/usePushNotifications';
import { Button } from '../../_components/ui/Button';
import { Card, CardHeader } from '../../_components/ui/Card';
import { Badge } from '../../_components/ui/Badge';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function Steps({ steps }: { steps: readonly string[] }) {
  return (
    <ol className="flex list-none flex-col gap-2 ps-0">
      {steps.map((step, i) => (
        <li key={step} className="flex items-start gap-3 text-sm text-foreground">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs font-semibold text-muted">
            {i + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

export function InstallGuide() {
  const push = usePushNotifications();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Chrome/Edge fire this when the app is installable; Safari never does, which
  // is why the iOS section is always shown as manual steps.
  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function runInstallPrompt() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  const pushErrorMessage =
    push.error === 'permission_denied'
      ? he.pwa.permissionDenied
      : push.error === 'push_not_configured'
        ? he.pwa.notConfigured
        : push.error === 'not_signed_in'
          ? he.pwa.signInFirst
          : push.error
            ? he.error.serverError
            : null;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title={he.pwa.whyTitle} icon={<Download size={16} />} />
        <ul className="flex list-none flex-col gap-2 ps-0">
          {he.pwa.whyPoints.map((point) => (
            <li key={point} className="flex items-start gap-2 text-sm text-foreground">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success-fg" />
              <span>{point}</span>
            </li>
          ))}
        </ul>

        {push.isStandalone && (
          <div className="mt-4">
            <Badge tone="success">{he.pwa.installed}</Badge>
          </div>
        )}
        {!push.isStandalone && deferredPrompt && (
          <Button className="mt-4 w-full" size="lg" onClick={runInstallPrompt}>
            <Download size={17} />
            {he.pwa.installNow}
          </Button>
        )}
      </Card>

      {/* Notifications first: it is the reason most people are on this page,
          and it is a requirement rather than a preference. */}
      <Card>
        <CardHeader title={he.pwa.notificationsTitle} icon={<Bell size={16} />} />
        <div className="mb-2">
          <Badge tone="warning">{he.pwa.required}</Badge>
        </div>
        <p className="text-sm text-foreground">{he.pwa.requiredBody}</p>
        <p className="mt-2 text-sm text-muted">{he.pwa.notificationsSubtitle}</p>

        <ul className="mt-3 flex list-none flex-col gap-2 ps-0">
          {he.pwa.whatYouGet.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-foreground">
              <Bell size={14} className="mt-1 shrink-0 text-muted" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-col gap-2">
          {push.isLoading && <p className="text-sm text-muted">{he.pwa.checking}</p>}

          {!push.isLoading && push.needsInstallFirst && (
            <p className="rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning-fg">
              {he.pwa.installFirst}
            </p>
          )}

          {!push.isLoading && !push.needsInstallFirst && !push.isSupported && (
            <p className="rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning-fg">
              {he.pwa.unsupported}
            </p>
          )}

          {pushErrorMessage && (
            <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger-fg">
              {pushErrorMessage}
            </p>
          )}

          {!push.isLoading && push.isSupported && !push.needsInstallFirst && (
            <>
              <Badge tone={push.isSubscribed ? 'success' : 'neutral'}>
                {push.isSubscribed ? he.pwa.enabled : he.pwa.disabled}
              </Badge>
              {push.isSubscribed ? (
                <Button variant="secondary" size="lg" disabled={push.isBusy} onClick={push.unsubscribe}>
                  <BellOff size={17} />
                  {he.pwa.disable}
                </Button>
              ) : (
                <Button size="lg" disabled={push.isBusy} onClick={push.subscribe}>
                  <Bell size={17} />
                  {he.pwa.enable}
                </Button>
              )}
            </>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title={he.pwa.iosTitle} icon={<Apple size={16} />} />
        <Steps steps={he.pwa.iosSteps} />
        <p className="mt-3 rounded-lg bg-info-bg px-3 py-2 text-sm text-info-fg">{he.pwa.iosNote}</p>
      </Card>

      <Card>
        <CardHeader title={he.pwa.androidTitle} icon={<Smartphone size={16} />} />
        <Steps steps={he.pwa.androidSteps} />
      </Card>

      <Card>
        <CardHeader title={he.pwa.desktopTitle} icon={<Monitor size={16} />} />
        <Steps steps={he.pwa.desktopSteps} />
      </Card>
    </div>
  );
}
