# Module: Notifications

## What actually exists today

Two real channels, despite three being named in `CLAUDE.md`'s stack section:

| Channel | Status | Where |
|---|---|---|
| **Email** (SMTP via `nodemailer`) | ✅ Implemented | `lib/mail/mailer.ts`: `sendOtpEmail`, `sendIncidentAlertEmail`. Best-effort — a mail failure never fails the underlying action (OTP request still returns `otp_sent`, incident still persists). |
| **WhatsApp deep link** (`wa.me`) | ✅ Implemented, link-only | `lib/utils/whatsapp.ts`. Not a bot/integration — just normalizes a phone number into a `https://wa.me/972...` link the UI renders as a button. One tap opens WhatsApp with that person pre-selected; nothing is sent automatically. |
| **Push (FCM)** | ❌ Not implemented | `User.fcmToken` column exists in the schema; `firebase-admin` is a listed dependency; **zero code anywhere sends a push notification or even collects a token.** This is a schema/dependency stub, not a working feature. |

This resolves `SPEC.md` conflict #1 (client wants WhatsApp + push, existing build assumed
FCM/email): the actual current state is neither — it's email + WhatsApp-deep-link only.
Real push notifications are unbuilt, not just "not this pass."

## Notification matrix (existing + this redesign's additions)

| Event | Recipients | Channel |
|---|---|---|
| OTP requested | The requesting user | Email |
| Incident reported | Team lead always; + `MAINTENANCE`-role users if routed there; + all `TEAM_LEAD`/`MAINTENANCE`/`ADMIN` if `EMERGENCY_BROADCAST` | Email to each with an address; UI also shows a `wa.me` link to the team lead as a fallback/faster path |
| Coverage requested `NEW` | The shift's team lead | Email — same pattern as incident reporting, reuse `sendMail`-style helper in `lib/mail/mailer.ts` |
| Coverage approved `NEW` | The requester (approved) **and** the new replacement (assigned) — two separate emails, different content | Email |
| Coverage rejected `NEW` | The requester only | Email, includes `decisionNote` if the team lead left one |
| Direct replacement assignment `NEW` | The newly assigned replacement (and the original worker, if the actor isn't them) | Email |

## Design for the new coverage notifications

Follows the exact pattern `sendIncidentAlertEmail` already establishes — same
best-effort, non-blocking send (`.catch(err => console.error(...))`, never throws into
the request handler), same RTL Hebrew HTML template style. Two new functions in
`lib/mail/mailer.ts`:

```
sendCoverageRequestEmail(to: teamLead.email, { requesterName, shiftDate, shiftTime, reason })
sendCoverageDecisionEmail(to: requester.email | replacement.email, { approved: boolean, shiftDate, shiftTime, decisionNote? })
```

## Open questions

- Should coverage notifications also get a `wa.me` fallback link like incidents do (team
  lead's phone, pre-filled with shift/date context)? Consistent with the existing
  pattern, cheap to add — flagged as a likely yes, not confirmed against a client answer.
- FCM being fully unbuilt means "instant" notification today is bounded by email
  deliverability (and the known `smtp.hostinger.com` intermittent-cert issue from
  operational history) — worth surfacing to the client as a real gap if "real-time" is a
  hard requirement for coverage decisions, not just incident alerts.

## Pre-shift reminders (2026-08-13)

"Your shift starts in 30 minutes", delivered by Web Push, configured by each worker in
`personal-area.md`.

**When it fires** — `lib/notifications/reminder-rules.ts` (pure, tested). It fires from
`startTime - leadMinutes` onwards rather than only in the exact minute, so a tick the
process missed still delivers late rather than not at all, and it stops dead at
`startTime`: after an outage, that rule is the only thing between a worker and a burst of
reminders about shifts already under way. Lead time is one of 10/15/30/45/60/90 minutes —
an enum, not free text, so a client cannot ask for a 3-minute lead the sweep ticks past or
a 30-day one that scans the whole shifts table.

**Who gets told** — the assigned replacement when there is one, otherwise the worker.
They are who has to turn up. SICK / HOLIDAY / CANCELLED shifts are skipped.

**What runs it** — `lib/scheduler/index.ts`, a 60-second interval started from
`instrumentation.ts` (Next runs `register()` once per server process). In-process for the
same reason the WhatsApp socket is: a second image, CI job and compose service to run one
cron costs more than it buys in a one-container app. The timer dies with every deploy,
which is survivable because idempotency lives in the database, not in memory.

**Idempotency** — `ShiftReminder` has a unique `(shiftId, userId)`. The row is written
*before* the push is sent, and losing that race is treated as "someone else already sent
it" rather than as an error, so two instances ticking on the same second deliver one
notification. The cost of that ordering is that a push failing after the row is written is
not retried — deliberate: a duplicate 04:00 alert is worse than a missed one the worker's
own schedule screen already shows.

### The custom-ringtone limit — read this before promising one

A Web Push notification **cannot** set a custom ringtone. `Notification.sound` was dropped
from the spec and is implemented in no browser; the sound a notification makes on a locked
phone belongs to the operating system's notification channel. A true custom tone needs a
native wrapper, not a PWA.

What is genuinely under our control, and what `ReminderSound` therefore drives:

1. **Vibration pattern** — distinct per tone (`soundProfile`), enough to identify a shift
   reminder by feel alone. This is the part that works on a locked phone.
2. **Silence** — `SILENT` sets `silent: true`, suppressing sound and vibration while still
   delivering the notification.
3. **An actual audio clip**, played by the page when the app is open: the service worker
   forwards the tone to open clients, and `AlertSoundPlayer` plays it. Autoplay policy
   means the first one may be blocked until the worker has interacted with the page — the
   preview button in `/settings` is what usually unlocks it.

The settings screen states this limitation to the worker in plain Hebrew
(`he.settings.soundLimitation`) rather than letting them discover it at 04:00.

The clips themselves are synthesised by `scripts/generate-alert-sounds.ts` into
`public/sounds/*.wav` — three short tones are a few kilobytes of arithmetic, and
generating them keeps binary assets nobody can diff or licence-check out of the repo.
