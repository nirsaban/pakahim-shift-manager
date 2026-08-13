import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LEAD_MINUTES,
  MAX_LEAD_MINUTES,
  isLeadMinutes,
  isReminderDue,
  minutesUntil,
  soundProfile,
  type ReminderCandidate,
} from './reminder-rules';

const SHIFT_START = new Date(2026, 7, 13, 14, 0, 0, 0);

function candidate(partial: Partial<ReminderCandidate> = {}): ReminderCandidate {
  return {
    shiftId: 'shift-1',
    userId: 'user-1',
    startTime: SHIFT_START,
    leadMinutes: DEFAULT_LEAD_MINUTES,
    enabled: true,
    alreadySent: false,
    ...partial,
  };
}

/** `minutes` before the shift start. */
function at(minutesBefore: number): Date {
  return new Date(SHIFT_START.getTime() - minutesBefore * 60_000);
}

describe('isReminderDue', () => {
  it('does not fire before the lead window opens', () => {
    expect(isReminderDue(candidate(), at(31))).toBe(false);
  });

  it('fires exactly at the lead time', () => {
    expect(isReminderDue(candidate(), at(30))).toBe(true);
  });

  it('still fires inside the window, so a missed tick delivers late rather than never', () => {
    expect(isReminderDue(candidate(), at(4))).toBe(true);
  });

  it('stops at the moment the shift starts', () => {
    expect(isReminderDue(candidate(), SHIFT_START)).toBe(false);
  });

  it('never fires for a shift already under way', () => {
    expect(isReminderDue(candidate(), new Date(SHIFT_START.getTime() + 60_000))).toBe(false);
  });

  it('respects the worker turning reminders off', () => {
    expect(isReminderDue(candidate({ enabled: false }), at(30))).toBe(false);
  });

  it('never sends the same reminder twice', () => {
    expect(isReminderDue(candidate({ alreadySent: true }), at(30))).toBe(false);
  });

  it('honours a custom lead time', () => {
    const c = candidate({ leadMinutes: 90 });
    expect(isReminderDue(c, at(91))).toBe(false);
    expect(isReminderDue(c, at(90))).toBe(true);
  });

  it('handles a lead time of zero as "at the start", which never fires', () => {
    expect(isReminderDue(candidate({ leadMinutes: 0 }), SHIFT_START)).toBe(false);
  });
});

describe('minutesUntil', () => {
  it('counts whole minutes to the start', () => {
    expect(minutesUntil(SHIFT_START, at(30))).toBe(30);
  });

  it('never goes negative once the shift has started', () => {
    expect(minutesUntil(SHIFT_START, new Date(SHIFT_START.getTime() + 5 * 60_000))).toBe(0);
  });
});

describe('soundProfile', () => {
  it('gives each tone a distinguishable vibration', () => {
    const patterns = ['CHIME', 'BELL', 'ALARM'].map((s) =>
      JSON.stringify(soundProfile(s as 'CHIME').vibrate),
    );
    expect(new Set(patterns).size).toBe(3);
  });

  it('silences both sound and vibration when the worker asks for silence', () => {
    expect(soundProfile('SILENT')).toEqual({ silent: true, vibrate: [] });
  });

  it('never marks an audible tone as silent', () => {
    for (const sound of ['CHIME', 'BELL', 'ALARM'] as const) {
      expect(soundProfile(sound).silent).toBe(false);
    }
  });
});

describe('lead time options', () => {
  it('accepts only the offered values', () => {
    expect(isLeadMinutes(30)).toBe(true);
    expect(isLeadMinutes(7)).toBe(false);
  });

  it('offers the default, and bounds the scheduler query by the largest option', () => {
    expect(isLeadMinutes(DEFAULT_LEAD_MINUTES)).toBe(true);
    expect(MAX_LEAD_MINUTES).toBe(90);
  });
});
