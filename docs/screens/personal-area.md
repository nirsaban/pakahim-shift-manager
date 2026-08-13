# Screen: Personal area

`app/settings/page.tsx` — route `/settings`. Server component; reached from the gear icon
in the dashboard header.

## Purpose

Two things a worker owns about themselves: the details other people need in order to reach
them, and their control over the pre-shift reminder. Available to **every role** — a team
lead has a phone number and a shift to be reminded of just like a פקח does.

## Data used

One `User` row, selected by `x-user-id` from the session. There is no `userId` parameter
anywhere on this screen or in the two API routes behind it, so it cannot be turned into a
read-or-edit-anyone endpoint. Admin-side editing of *other* workers stays where it was,
behind `/api/users/[id]` and its role gate (`manage-teams-workers.md`).

## States

1. **My details** (`ProfileForm`) — first name, last name, mobile phone, city. Saved via
   `PATCH /api/users/me`.
   - Phone is validated by `normalizeIsraeliPhone`, the same parser that addresses
     WhatsApp, so a number that saves is a number an OTP can actually reach. It is stored
     as typed (the app shows it back to the worker) and normalized at point of use.
   - **Worker number and email are shown but locked**, each with a line saying why: the
     worker number is the roster file's identifier for this person and editing it would
     break every future import's match; the email is where a login code is sent.
   - Team and role are absent entirely — the roster file owns those, and a worker editing
     their own team would silently diverge from what the scheduling department sends.
2. **Pre-shift reminder** (`ReminderSettingsForm`) — on/off, lead time
   (10/15/30/45/60/90 minutes), and tone (chime / bell / alarm / silent). Saved via
   `PATCH /api/users/me/reminders`. Defaults are on / 30 minutes / chime, so the feature
   works for every existing worker without them touching anything.
   - Lead time and tone stay editable while reminders are off: a worker turning them back
     on should find their old settings waiting, not reset.
   - The **preview button** does double duty — it is the only way to hear a tone before
     committing to being woken by it, and it is the user gesture that unlocks audio
     playback for the tab, so a reminder arriving later while the app is open can actually
     make a sound.
   - An info panel states the custom-ringtone limitation in plain Hebrew. See
     `notifications.md` § "The custom-ringtone limit" — a locked phone plays the OS
     notification sound and no PWA can override it. Saying so here beats letting a worker
     discover it at 04:00.

## Actions & side effects

`PATCH /api/users/me` and `PATCH /api/users/me/reminders`. Both scoped to the caller.
Changing the reminder settings takes effect on the scheduler's next 60-second tick — there
is nothing to restart.

## Permissions

Any signed-in user, own record only. `/settings` is not in `proxy.ts`'s `PUBLIC_PATHS`, so
the session gate applies as it does to `/dashboard`.

## Open questions

- City is free text, matching registration. It feeds `HomeStationSource.DERIVED_FROM_CITY`
  in the swap engine, which would be better served by the same station picker the home
  station uses — deferred rather than resolved, since it is a change to registration too.
- Nothing here lets a worker change their email, which means a worker whose email is wrong
  has to reach an admin to fix the thing they log in with. Flagged; the fix needs an
  OTP-to-the-new-address flow rather than a plain text field.
