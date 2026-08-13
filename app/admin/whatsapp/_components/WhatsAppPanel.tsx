'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, QrCode, Smartphone, TriangleAlert, Loader2 } from 'lucide-react';
import { he } from '@/lib/he';
import { Card, CardHeader } from '../../../_components/ui/Card';
import { Button } from '../../../_components/ui/Button';
import { Badge } from '../../../_components/ui/Badge';

type Status = 'pending' | 'qr' | 'connected' | 'disconnected' | 'logged_out';

interface State {
  status: Status;
  phoneNumber: string | null;
  qrImage: string | null;
}

// Baileys rotates the pairing QR roughly every 20s and reports "connected"
// asynchronously once the phone finishes the handshake, so the panel polls
// rather than waiting on the request that started pairing. Slower while idle:
// only the pairing states change on their own.
const POLL_FAST_MS = 2000;
const POLL_IDLE_MS = 10000;

const STATUS_LABEL: Record<Status, string> = {
  pending: he.whatsapp.statusPending,
  qr: he.whatsapp.statusQr,
  connected: he.whatsapp.statusConnected,
  disconnected: he.whatsapp.statusDisconnected,
  logged_out: he.whatsapp.statusLoggedOut,
};

const STATUS_TONE: Record<Status, 'success' | 'warning' | 'danger' | 'neutral'> = {
  pending: 'neutral',
  qr: 'warning',
  connected: 'success',
  disconnected: 'warning',
  logged_out: 'danger',
};

export function WhatsAppPanel() {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Held in a ref so the polling effect reads the current cadence without
  // tearing down and recreating the interval on every state change.
  const statusRef = useRef<Status | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/whatsapp');
      if (!res.ok) {
        setError(res.status === 403 ? he.error.forbidden : he.error.serverError);
        return;
      }
      const data = (await res.json()) as State;
      statusRef.current = data.status;
      setState(data);
      setError('');
    } catch {
      setError(he.error.networkError);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const loop = async () => {
      if (cancelled) return;
      await refresh();
      if (cancelled) return;
      const pairing = statusRef.current === 'qr' || statusRef.current === 'pending';
      timer = setTimeout(loop, pairing ? POLL_FAST_MS : POLL_IDLE_MS);
    };

    // Deferred rather than awaited inline: refresh() sets state, and doing that
    // synchronously in an effect body forces a cascading render.
    timer = setTimeout(loop, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [refresh]);

  async function act(action: 'connect' | 'logout') {
    if (action === 'logout' && !confirm(he.whatsapp.disconnectConfirm)) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        setError(res.status === 403 ? he.error.forbidden : he.error.serverError);
        return;
      }
      await refresh();
    } catch {
      setError(he.error.networkError);
    } finally {
      setBusy(false);
    }
  }

  const status = state?.status;
  const connected = status === 'connected';

  return (
    <Card>
      <CardHeader
        title={he.whatsapp.title}
        icon={<MessageCircle size={16} />}
        action={
          status ? <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge> : null
        }
      />

      <p className="mb-4 text-sm text-muted">{he.whatsapp.subtitle}</p>

      {error && (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger-fg">
          <TriangleAlert size={14} className="shrink-0" />
          {error}
        </p>
      )}

      {!state && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
          <Loader2 size={16} className="animate-spin" />
        </div>
      )}

      {connected && (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-success-bg px-3.5 py-2.5 text-sm text-success-fg">
          <Smartphone size={16} className="shrink-0" />
          <span>
            {he.whatsapp.connectedAs}{' '}
            <span dir="ltr" className="font-medium">
              {state?.phoneNumber ?? '—'}
            </span>
          </span>
        </div>
      )}

      {state?.qrImage && !connected && (
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-[var(--radius-lg)] border border-border bg-white p-3">
            {/* A plain img, not next/image: the source is an inline data: URI
                regenerated every few seconds, so there is nothing for the image
                optimizer to do and its src validation only gets in the way. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={state.qrImage} alt={he.whatsapp.title} width={280} height={280} />
          </div>
          <p className="text-center text-sm text-muted">{he.whatsapp.scanInstructions}</p>
        </div>
      )}

      {state && !connected && !state.qrImage && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <QrCode size={40} className="text-muted" />
          <p className="text-sm text-muted">
            {status === 'qr' ? he.whatsapp.qrExpired : he.whatsapp.otpFallbackNotice}
          </p>
        </div>
      )}

      <div className="mt-5 flex gap-2">
        {!connected && (
          <Button onClick={() => act('connect')} disabled={busy} className="flex-1">
            {status === 'logged_out' || status === 'pending'
              ? he.whatsapp.connect
              : he.whatsapp.reconnect}
          </Button>
        )}
        {(connected || status === 'qr') && (
          <Button variant="danger" onClick={() => act('logout')} disabled={busy} className="flex-1">
            {he.whatsapp.disconnect}
          </Button>
        )}
      </div>
    </Card>
  );
}
