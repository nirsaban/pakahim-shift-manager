# PWA install & push notifications

The app installs to the home screen and delivers push notifications through **Web Push (VAPID)**, matching the approach in the Miluim project rather than FCM.

## Why Web Push and not FCM

`CLAUDE.md` non-negotiable #6 says FCM, and `firebase-admin` is still a dependency. This deviates deliberately:

- No Firebase project to provision or keep credentials for — a VAPID keypair is generated with one command.
- Same stack as the other GeniriFlow products, so there is one thing to debug rather than two.
- Works on iOS 16.4+ for installed PWAs, which is the actual constraint here.

`User.fcmToken` is left in place but unused. Remove it when the FCM path is formally dropped.

## The iOS constraint drives the UX

Safari exposes `PushManager` **only after the PWA is added to the home screen**. So the UI reports `isStandalone` separately from `isSupported`: on an un-installed iOS browser it says *"install first"*, never *"notifications unavailable"*. That single fact is why `/install` exists.

## Pieces

| Path | Role |
| --- | --- |
| `public/manifest.json` | name, RTL/Hebrew, icons, `start_url: /dashboard` |
| `public/icons/*` | generated from the brand gradient, maskable-safe |
| `public/sw.js` | `push` + `notificationclick` + `pushsubscriptionchange` |
| `app/_components/ServiceWorkerRegistrar.tsx` | registers `/sw.js` on every page |
| `lib/hooks/usePushNotifications.ts` | support/standalone detection, subscribe, unsubscribe |
| `app/install/` | Hebrew install + notifications guide, per platform |
| `lib/services/push-service.ts` | VAPID config, delivery, dead-endpoint cleanup |
| `app/api/push/*` | VAPID public key, subscribe, unsubscribe |

**`proxy.ts` must keep the PWA assets outside the auth check.** A service worker is only registered if `/sw.js` returns the script; a `307` to `/login` silently disables push for everyone. The matcher excludes `manifest.json`, `sw.js`, `icons/` and image extensions, and `/install` + `/api/push/vapid-public-key` are in `PUBLIC_PATHS`.

`sw.js` is deliberately **not** a caching service worker. Shift data is safety-relevant and changes through the day; serving a stale roster from cache would be worse than showing nothing.

## What triggers a push

| Event | Recipients | Where |
| --- | --- | --- |
| Newly scheduled for a shift | that worker | `upload-service` |
| Shift times/route changed | that worker | `upload-service` |
| No longer on the roster | that worker | `upload-service` |
| Incident reported | team lead (+ maintenance / all leads on emergency) | `incident-service` |
| Coverage request raised | team lead | `coverage-service` |
| Coverage approved / rejected | requester | `coverage-service` |
| Assigned as someone's replacement | the replacement | `coverage-service` |

An `EMERGENCY_BROADCAST` incident sets `requireInteraction`, so it stays on screen until dismissed. Nothing else does.

### Re-uploads must not re-notify

A roster import is a destructive replace, so naively notifying "you have a shift" would push to ~240 workers **every** upload, including a re-upload of the identical file. `importShiftFile` snapshots the existing shifts for that date *before* the transaction and compares a signature of `(startTime, endTime, notes)`. Only genuine changes notify; an unchanged re-upload notifies nobody.

A genuinely new roster day does fan out to everyone scheduled — that is the intended behaviour, and it only reaches workers who have subscribed a device.

## Failure handling

Every send is fire-and-forget via `notify()`. A push failure must never roll back what it was reporting: the incident is still filed, the roster still imported, the coverage decision still stands. A `404`/`410` from the push service means the endpoint is dead, so the subscription is deactivated rather than retried forever.

With no VAPID keys configured the service logs a warning once and every send is a no-op — the app works, it just does not notify.

## Setup

```bash
npx web-push generate-vapid-keys      # then set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT
npm run push:test                     # send a test push to a subscribed user
npm run push:test -- worker@demo.local
```

Push requires **HTTPS** in production (localhost is exempt).

## Data-accuracy disclaimer

`app/_components/DataAccuracyNotice.tsx` blocks the dashboard on first sight with a warning that everything shown is parsed out of the Excel roster and inferred on top, and must be checked against the original file. Once acknowledged it collapses to a permanent one-line reminder — it never disappears entirely.

Acknowledgement is stored in `localStorage` under a versioned key. Bump `ACK_VERSION` to re-prompt everyone whenever the wording or the accuracy situation materially changes.
