import { sweepShiftReminders } from '../services/reminder-service';

/**
 * The app's background tick, running in-process inside the Next.js server.
 *
 * Same call as WhatsApp: pakahim is a one-container app, and standing up a
 * second image, CI job and compose service to run one cron would cost more than
 * it buys. The trade-off is that the timer dies with every deploy - survivable
 * because every reminder it has already sent is recorded in the database, so a
 * restart mid-window resumes rather than re-sends.
 *
 * Started from instrumentation.ts, which Next runs once per server process.
 */

/** Once a minute: fine enough for a lead time measured in tens of minutes. */
const TICK_MS = 60_000;

let timer: NodeJS.Timeout | null = null;
let running = false;

async function tick(): Promise<void> {
  // Skip rather than queue: a sweep that outruns the interval means the
  // database is struggling, and piling concurrent sweeps on top would be the
  // worst possible response to that.
  if (running) return;
  running = true;
  try {
    const result = await sweepShiftReminders();
    if (result.sent > 0 || result.failed > 0) {
      console.log(`[scheduler] shift reminders: sent ${result.sent}, failed ${result.failed}`);
    }
  } catch (error) {
    // A failed sweep must never take the server with it - the next tick retries.
    console.error('[scheduler] shift reminder sweep failed', error);
  } finally {
    running = false;
  }
}

export function startScheduler(): void {
  if (timer) return;

  console.log('[scheduler] starting shift-reminder sweep every 60s');
  timer = setInterval(() => {
    void tick();
  }, TICK_MS);
  // Never hold the process open on this alone.
  timer.unref?.();

  // One sweep immediately, so a deploy that lands inside someone's lead window
  // delivers now rather than up to a minute later.
  void tick();
}

export function stopScheduler(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}
