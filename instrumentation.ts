/**
 * Next runs this once per server process, before the first request.
 *
 * It is the only hook the app has for work that must happen on a timer rather
 * than in response to a request - everything else here is lazily started by
 * whichever route first touches it, which is fine for the WhatsApp socket and
 * useless for a scheduler that has to fire whether or not anyone is browsing.
 */
export async function register(): Promise<void> {
  // Also evaluated in the edge runtime, where timers and prisma do not exist.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { startScheduler } = await import('./lib/scheduler');
  startScheduler();
}
