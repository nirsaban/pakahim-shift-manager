'use client';

import { useEffect } from 'react';

/**
 * Registers /sw.js once, on every page.
 *
 * Registration has to happen outside the push flow: iOS only reveals PushManager
 * after the PWA is installed AND a service worker is active, so waiting until
 * the user taps "enable notifications" would fail on exactly the platform that
 * needs it most.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('[sw] registration failed', error);
    });
  }, []);

  return null;
}
