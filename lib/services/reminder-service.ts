import { prisma } from '../db/prisma';
import { he } from '../he';
import {
  MAX_LEAD_MINUTES,
  isReminderDue,
  minutesUntil,
  soundProfile,
  type ReminderCandidate,
  type ReminderSound,
} from '../notifications/reminder-rules';
import { sendPushToUsers } from './push-service';

/**
 * Pre-shift reminders: "your shift starts in 30 minutes".
 *
 * The decision of *when* lives in lib/notifications/reminder-rules.ts and is
 * pure; this layer only supplies the candidates and records what it sent. The
 * ShiftReminder row is the idempotency key and it lives in the database rather
 * than in process memory precisely so a deploy in the middle of someone's lead
 * window does not re-send.
 */

export interface SweepResult {
  considered: number;
  due: number;
  sent: number;
  failed: number;
}

/**
 * Everyone who might be due right now.
 *
 * Bounded to shifts starting within the largest lead time any worker can pick,
 * so this stays a small indexed range scan rather than a table walk, whatever
 * the roster contains. SICK / HOLIDAY / CANCELLED are excluded - a worker not
 * working the shift does not need waking for it - and the person told is the
 * assigned replacement when there is one, because they are who has to turn up.
 */
async function loadCandidates(now: Date): Promise<ReminderCandidate[]> {
  const horizon = new Date(now.getTime() + MAX_LEAD_MINUTES * 60_000);

  const shifts = await prisma.shift.findMany({
    where: {
      startTime: { gt: now, lte: horizon },
      status: { in: ['SCHEDULED', 'STARTED'] },
    },
    select: {
      id: true,
      startTime: true,
      workerId: true,
      replacementId: true,
      worker: {
        select: { id: true, shiftReminderEnabled: true, shiftReminderLeadMinutes: true },
      },
      replacement: {
        select: { id: true, shiftReminderEnabled: true, shiftReminderLeadMinutes: true },
      },
      reminders: { select: { userId: true } },
    },
  });

  return shifts.map((shift) => {
    const person = shift.replacement ?? shift.worker;
    return {
      shiftId: shift.id,
      userId: person.id,
      startTime: shift.startTime,
      leadMinutes: person.shiftReminderLeadMinutes,
      enabled: person.shiftReminderEnabled,
      alreadySent: shift.reminders.some((r) => r.userId === person.id),
    };
  });
}

/**
 * Send every reminder that has come due, and record it.
 *
 * The ShiftReminder row is written BEFORE the push goes out, and a row that
 * loses the unique-constraint race is treated as "someone else already sent
 * it" rather than as an error. Two app instances ticking at the same second
 * therefore deliver one notification, not two - and the cost of the ordering is
 * that a push failing after the row is written is not retried, which is the
 * right trade: a duplicate 3am alert is worse than a missed one that the
 * worker's own schedule screen already shows.
 */
export async function sweepShiftReminders(now = new Date()): Promise<SweepResult> {
  const candidates = await loadCandidates(now);
  const due = candidates.filter((c) => isReminderDue(c, now));

  const result: SweepResult = { considered: candidates.length, due: due.length, sent: 0, failed: 0 };
  if (due.length === 0) return result;

  // Each worker's chosen tone, fetched once for the handful of people involved.
  const people = await prisma.user.findMany({
    where: { id: { in: [...new Set(due.map((d) => d.userId))] } },
    select: { id: true, shiftReminderSound: true },
  });
  const soundByUser = new Map(people.map((p) => [p.id, p.shiftReminderSound as ReminderSound]));

  for (const candidate of due) {
    let claimed = true;
    try {
      await prisma.shiftReminder.create({
        data: {
          shiftId: candidate.shiftId,
          userId: candidate.userId,
          leadMinutes: candidate.leadMinutes,
        },
      });
    } catch {
      // Unique violation: another tick, or another instance, got there first.
      claimed = false;
    }
    if (!claimed) continue;

    const minutes = minutesUntil(candidate.startTime, now);
    const profile = soundProfile(soundByUser.get(candidate.userId) ?? 'CHIME');

    const outcome = await sendPushToUsers([candidate.userId], {
      title: he.push.shiftReminder.title,
      body: he.push.shiftReminder.body(minutes),
      url: '/dashboard',
      // Per shift, so a reminder never collapses onto a roster-change notice.
      tag: `shift-reminder-${candidate.shiftId}`,
      sound: soundByUser.get(candidate.userId) ?? 'CHIME',
      silent: profile.silent,
      vibrate: profile.vibrate,
    });

    result.sent += outcome.sent;
    result.failed += outcome.failed;
  }

  return result;
}
