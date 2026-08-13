// When a pre-shift reminder is due, and what it should sound like.
//
// Pure by the same rule as lib/roster/: no prisma, no Next runtime. The
// scheduler that uses this runs once a minute in a long-lived process, so
// "should this fire right now" is exactly the kind of decision that has to be
// testable against a fixed clock rather than observed in production an hour
// later.

/** The lead times offered in /settings. Anything else is rejected at the API. */
export const LEAD_MINUTE_OPTIONS = [10, 15, 30, 45, 60, 90] as const;

export const DEFAULT_LEAD_MINUTES = 30;

/** Bounds the scheduler's database query - nothing can be due earlier than this. */
export const MAX_LEAD_MINUTES = Math.max(...LEAD_MINUTE_OPTIONS);

export type ReminderSound = 'CHIME' | 'BELL' | 'ALARM' | 'SILENT';

export const REMINDER_SOUNDS: ReminderSound[] = ['CHIME', 'BELL', 'ALARM', 'SILENT'];

export interface ReminderCandidate {
  shiftId: string;
  /** Who gets told: the replacement when one is assigned, otherwise the worker. */
  userId: string;
  startTime: Date;
  leadMinutes: number;
  enabled: boolean;
  /** A ShiftReminder row already exists for this (shift, user). */
  alreadySent: boolean;
}

/**
 * Is this reminder due right now?
 *
 * Two boundaries, both deliberate. It fires from `startTime - leadMinutes`
 * onwards rather than only in the exact minute, so a tick the process missed
 * (a deploy, a slow sweep) still delivers late rather than not at all. And it
 * stops at `startTime`: a worker whose shift has already begun does not need to
 * be told it is about to, and after a long outage that rule is the only thing
 * standing between them and a burst of notifications about shifts already
 * underway.
 */
export function isReminderDue(candidate: ReminderCandidate, now: Date): boolean {
  if (!candidate.enabled) return false;
  if (candidate.alreadySent) return false;

  const fireAt = candidate.startTime.getTime() - candidate.leadMinutes * 60_000;
  const nowMs = now.getTime();
  return nowMs >= fireAt && nowMs < candidate.startTime.getTime();
}

/** Whole minutes from now until the shift starts; never negative. */
export function minutesUntil(startTime: Date, now: Date): number {
  return Math.max(0, Math.round((startTime.getTime() - now.getTime()) / 60_000));
}

/**
 * How the chosen tone is actually expressed on the device.
 *
 * Honest limitation: a Web Push notification cannot carry a custom ringtone.
 * `Notification.sound` was dropped from the spec and is implemented nowhere;
 * the sound a notification makes on a locked phone belongs to the operating
 * system's notification channel, not to us. What a PWA genuinely controls is
 * three things, and this is all of them:
 *
 *   1. the vibration pattern, which is distinctive enough to tell a shift
 *      reminder apart from anything else by feel alone;
 *   2. silence, when the worker asks for it;
 *   3. an actual audio clip, played by the page itself when the app is open -
 *      see the sound player on the dashboard.
 *
 * A true custom lock-screen ringtone needs a native wrapper. Rather than
 * pretend otherwise, the settings screen says what each option does.
 */
export function soundProfile(sound: ReminderSound): { silent: boolean; vibrate: number[] } {
  switch (sound) {
    case 'BELL':
      return { silent: false, vibrate: [200, 100, 200, 100, 200] };
    case 'ALARM':
      return { silent: false, vibrate: [400, 150, 400, 150, 400, 150, 400] };
    case 'SILENT':
      return { silent: true, vibrate: [] };
    case 'CHIME':
    default:
      return { silent: false, vibrate: [120, 60, 120] };
  }
}

export function isLeadMinutes(value: number): boolean {
  return (LEAD_MINUTE_OPTIONS as readonly number[]).includes(value);
}
