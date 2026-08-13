/* Service worker: Web Push delivery + install/activate lifecycle.
 *
 * Deliberately NOT a caching service worker. Shift data is safety-relevant and
 * changes through the day; serving a stale roster from cache would be worse
 * than showing nothing. Offline support, if it is ever added, should cache the
 * app shell only and never an API response.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = { title: 'עדכון חדש', body: '' };

  try {
    if (event.data) payload = event.data.json();
  } catch {
    // A push with a non-JSON body still deserves to surface.
    payload = { title: 'עדכון חדש', body: event.data ? event.data.text() : '' };
  }

  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    // `tag` collapses repeats of the same subject instead of stacking them.
    tag: payload.tag || 'general',
    renotify: Boolean(payload.tag),
    data: { url: payload.url || '/dashboard', sound: payload.sound || null },
    // A per-alert pattern, so a shift reminder is identifiable by feel alone.
    vibrate: Array.isArray(payload.vibrate) ? payload.vibrate : [100, 50, 100],
    silent: payload.silent === true,
    dir: 'rtl',
    lang: 'he',
    requireInteraction: payload.urgent === true,
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(payload.title || 'עדכון חדש', options),
      playInOpenClients(payload),
    ]),
  );
});

/* A notification's sound belongs to the operating system - `Notification.sound`
 * is implemented nowhere, so a PWA cannot set a custom ringtone on a locked
 * phone. What it CAN do is ask an already-open page to play the clip itself,
 * which is what a worker sitting with the app open actually hears. Silence is
 * respected here too: SILENT asks for no tone at all. */
async function playInOpenClients(payload) {
  if (!payload.sound || payload.sound === 'SILENT' || payload.silent === true) return;

  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({ type: 'play-alert-sound', sound: payload.sound });
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

// Chrome can rotate a subscription; re-register so delivery does not silently stop.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription?.options ?? { userVisibleOnly: true })
      .then((subscription) =>
        fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription.toJSON()),
        }),
      )
      .catch(() => {}),
  );
});
