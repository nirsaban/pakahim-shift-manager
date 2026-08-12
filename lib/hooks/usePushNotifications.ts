'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Web Push subscription lifecycle.
 *
 * The iOS rule drives the whole UX: Safari exposes PushManager **only** once the
 * PWA has been added to the home screen. So `isStandalone` is reported
 * separately from `isSupported` — on an un-installed iOS browser the UI must say
 * "install first", not "notifications unavailable".
 */

// Backed by an explicit ArrayBuffer so the result satisfies BufferSource —
// a bare Uint8Array is generic over ArrayBufferLike, which includes
// SharedArrayBuffer and is therefore not assignable to applicationServerKey.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export type PushPlatform = 'ios' | 'android' | 'desktop';

export interface UsePushNotifications {
  isSupported: boolean;
  isStandalone: boolean;
  /** iOS only exposes push once installed — surfaced so the UI can explain why. */
  needsInstallFirst: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  isBusy: boolean;
  permission: NotificationPermission | null;
  platform: PushPlatform;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

function detectPlatform(): PushPlatform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  // iPadOS 13+ reports itself as a Mac; the touch-point count gives it away.
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function detectSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * These are facts about the environment, not state this component derives — so
 * they are read through useSyncExternalStore rather than assigned inside an
 * effect. Display mode genuinely changes at runtime: a user can install the app
 * and come straight back to this screen.
 */
function subscribeToDisplayMode(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const media = window.matchMedia('(display-mode: standalone)');
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

const noopSubscribe = () => () => {};

export function usePushNotifications(): UsePushNotifications {
  const isSupported = useSyncExternalStore(noopSubscribe, detectSupported, () => false);
  const isStandalone = useSyncExternalStore(subscribeToDisplayMode, detectStandalone, () => false);
  const platform = useSyncExternalStore<PushPlatform>(
    noopSubscribe,
    detectPlatform,
    () => 'desktop',
  );

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Derived, not stored: with no push support there is nothing to wait for.
  const isLoading = isSupported && !subscriptionChecked;

  useEffect(() => {
    if (!isSupported) return;

    let cancelled = false;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (cancelled) return;
        setIsSubscribed(Boolean(subscription));
        setPermission(Notification.permission);
      })
      .catch(() => {
        if (!cancelled) setIsSubscribed(false);
      })
      .finally(() => {
        if (!cancelled) setSubscriptionChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    setError(null);
    setIsBusy(true);
    try {
      const keyRes = await fetch('/api/push/vapid-public-key');
      const { publicKey } = (await keyRes.json()) as { publicKey: string | null };
      if (!publicKey) {
        setError('push_not_configured');
        return false;
      }

      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') {
        setError('permission_denied');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      // Reuse an existing subscription rather than creating a duplicate endpoint.
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) {
        // /install is reachable while logged out, so this is a normal path, not
        // a fault: the browser subscription exists but we have nobody to file it
        // against. Drop it again so the UI does not claim to be subscribed.
        if (res.status === 401) {
          await subscription.unsubscribe().catch(() => {});
          setError('not_signed_in');
        } else {
          setError('server_error');
        }
        return false;
      }

      setIsSubscribed(true);
      return true;
    } catch (e) {
      console.error('[push] subscribe failed', e);
      setError('server_error');
      return false;
    } finally {
      setIsBusy(false);
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setError(null);
    setIsBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
      return true;
    } catch (e) {
      console.error('[push] unsubscribe failed', e);
      setError('server_error');
      return false;
    } finally {
      setIsBusy(false);
    }
  }, []);

  return {
    isSupported,
    isStandalone,
    needsInstallFirst: platform === 'ios' && !isStandalone,
    isSubscribed,
    isLoading,
    isBusy,
    permission,
    platform,
    error,
    subscribe,
    unsubscribe,
  };
}
