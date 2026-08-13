# Scoping: a native wrapper, for real ringtones

Written 2026-08-13, in response to the client's ask for "a special ringtone" on the
pre-shift reminder. That ask **cannot be met by the PWA** — see `notifications.md` § "The
custom-ringtone limit". This document is the decision material for whether to go native,
not a commitment to it.

## The problem in one paragraph

`Notification.sound` was dropped from the Web Notifications spec and is implemented in no
browser. When a push arrives and the phone is locked, the sound belongs to the operating
system's notification channel, and a web page has no say in it. The PWA already does
everything it is permitted to do: a per-tone vibration pattern, true silence on request,
and an audio clip played by the page when the app happens to be open. A distinct tone on a
locked phone at 04:00 — which is the actual use case — needs native code.

## Options, and why three of the four are wrong

| Option | Solves the ringtone? | Cost of getting there | Verdict |
|---|---|---|---|
| **Stay on the PWA** | ❌ No | £0 | Correct if the vibration pattern turns out to be enough. Ask the client before spending anything. |
| **TWA** (Trusted Web Activity) | ❌ **No** | ~1 day | The trap. It puts the PWA in the Play Store and *looks* native, but notifications still arrive over the same Web Push path, so the sound is still the OS's. Buys a store listing and nothing else. |
| **Capacitor** | ✅ Yes | ~5–8 days | **Recommended.** A real native shell around the *same* web app — no UI rewritten, no second frontend to keep in sync. Gets real FCM, real notification channels, real custom sounds. |
| **React Native / Flutter rewrite** | ✅ Yes | Weeks | Throws away a working Next.js app to solve one notification problem. Not justifiable. |

## Why Capacitor works where the PWA cannot

On Android 8+ a notification's sound is a property of its **`NotificationChannel`**, fixed
when the channel is created and **immutable afterwards** — this is the single fact that
shapes the whole design. You cannot change a channel's sound later; the user can, in
system settings, and the app cannot override them. So offering four tones means creating
**four channels**, one per sound, and routing each notification to the channel matching the
worker's choice:

```
pakahim_reminder_chime  -> res/raw/chime.wav
pakahim_reminder_bell   -> res/raw/bell.wav
pakahim_reminder_alarm  -> res/raw/alarm.wav
pakahim_reminder_silent -> no sound, IMPORTANCE_DEFAULT
```

The tones already exist (`scripts/generate-alert-sounds.ts`) and drop straight into
`res/raw/`. They are 16-bit mono PCM WAV, which Android plays natively.

The reminder must be sent as an FCM **data message**, not a notification message, and built
by a `FirebaseMessagingService` in the app — otherwise the system builds the notification
before our code can pick a channel.

On iOS the same idea, different mechanism: the sound is a `sound` field in the APNs payload
naming a file bundled in the app (≤30s; aiff/wav/caf). No channels, no immutability
problem, but it needs an Apple Developer account and an APNs key.

## What this costs, honestly

**Money**

| | |
|---|---|
| Google Play registration | **$25**, one-time |
| Apple Developer Program | **$99/year**, recurring, only if iOS is in scope |
| Firebase (FCM) | Free at this volume |

**Time** — roughly 5–8 working days for Android only; add 3–4 for iOS.

| Work | Est. |
|---|---|
| Capacitor shell, config, build pipeline | 1 day |
| Firebase project, FCM wiring, token registration | 1 day |
| The four notification channels + `FirebaseMessagingService` | 1–2 days |
| Server: FCM delivery alongside Web Push | 1–2 days |
| Store listing, screenshots, privacy declaration, review | 1 day + review latency |
| Distribution decision and rollout to ~240 workers | 1 day |

**Things that are not free but are easy to forget**

- **Distribution becomes a real problem.** Today a worker taps "add to home screen". After
  this they must install an app — Play Store, internal testing track, or managed Google
  Play. For ~240 railway staff this is an organisational rollout, not a technical step, and
  it is the most likely thing to stall the project.
- **Play review latency** is days, not minutes, and applies to every release.
- **The web app does not go away.** Desktop and any worker who does not install the app
  still use it, so Web Push stays. The server ends up maintaining **two** delivery paths.
- **Apple's $99 is annual.** If it lapses, the iOS app stops being distributable.

## What it touches in this codebase

Less than it sounds, because Capacitor reuses the web app as-is.

- `lib/services/push-service.ts` — grows an FCM path beside Web Push. `sendPushToUsers`
  becomes "send by whatever channel this user is reachable on".
- `User.fcmToken` — **already exists in the schema**, unused since the original FCM stub.
  A device-scoped table would be better than one column per user (a worker may have a
  phone and a tablet), so expect a small migration.
- `lib/services/reminder-service.ts` — unchanged. It already asks for a tone by name; only
  the transport below it changes.
- `lib/notifications/reminder-rules.ts` — unchanged. `soundProfile` gains a channel-id
  mapping and keeps the vibration patterns for the web path.
- **Nothing in `app/`.** No screen is rewritten. This is the whole argument for Capacitor.

## Recommendation

**Ask the client one question before spending anything:** is the distinct *vibration*
pattern enough, or does it have to be an audible tone? If a worker's phone is on silent
overnight — plausible for shift workers — the vibration is what they will actually feel,
and it already works.

If the answer is "it must make a sound", then: **Capacitor, Android only, no iOS until
someone asks.** Israel Railways inspectors on Android are the majority of the user base,
$25 beats $99/year, and the Android path is where the ringtone requirement actually bites.

**Do not build a TWA.** It is the option that looks like the cheap answer and does not
solve the problem.

## Prerequisites before any of this can be built here

Neither exists on this server today:

- A **JDK** and the **Android SDK** (~10–15 GB). Best installed as a disposable Docker
  build image rather than on the host — this box already runs 20 containers for other
  projects and filled its disk once today.
- A **Firebase project** and a **Google Play account**, both of which only the account
  owner can create.

Generating the Capacitor project and writing the Android sources needs neither. Producing a
signed, installable APK needs both.
