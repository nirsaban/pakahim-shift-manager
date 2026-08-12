import { AlertTriangle, BellRing } from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { he } from '@/lib/he';
import { isPushConfigured } from '@/lib/services/push-service';
import { Card, CardHeader } from '../../_components/ui/Card';
import { Badge } from '../../_components/ui/Badge';

/**
 * Admin-only view of whether push is actually wired up on the server.
 *
 * Without this, a missing VAPID keypair looks identical to a working system
 * right up until someone notices they never get notified — the only symptom is
 * a worker seeing "not configured" and being told to contact an admin who has
 * no way to check.
 */
export async function PushServiceStatus({ tenantId }: { tenantId: string }) {
  const configured = isPushConfigured();
  const devices = await prisma.pushSubscription.count({
    where: { isActive: true, user: { tenantId } },
  });

  return (
    <Card>
      <CardHeader
        title={he.pwa.serverStatusTitle}
        icon={configured ? <BellRing size={16} /> : <AlertTriangle size={16} />}
      />
      <div className="flex flex-col gap-2">
        <Badge tone={configured ? 'success' : 'danger'}>
          {configured ? he.pwa.serverConfigured : he.pwa.serverNotConfigured}
        </Badge>
        {!configured && <p className="text-sm text-muted">{he.pwa.serverNotConfiguredHint}</p>}
        <p className="text-sm text-muted">
          {he.pwa.subscribedDevices}: {devices}
        </p>
      </div>
    </Card>
  );
}
