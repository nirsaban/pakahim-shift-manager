'use client';

import { useSyncExternalStore } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { he } from '@/lib/he';
import { Button } from './ui/Button';

/**
 * Everything the app shows about a shift is *derived*: parsed out of the Excel
 * roster by the tokenizer, with handoffs and swaps inferred on top. Some of it
 * is explicitly marked uncertain. A worker turning up to the wrong train because
 * they trusted a parse is the failure mode that matters, so the warning is
 * blocking on first sight and never disappears entirely afterwards.
 *
 * Bumping ACK_VERSION re-prompts everyone — do that whenever the wording or the
 * accuracy situation materially changes.
 */
const ACK_VERSION = '2026-08-12';
const ACK_KEY = `pakahim.disclaimer.ack.${ACK_VERSION}`;

// The acknowledgement lives in localStorage, which is external state — read it
// through a store rather than assigning it inside an effect. `storage` events
// also keep other open tabs in sync.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

function isAcknowledged(): boolean {
  try {
    return window.localStorage.getItem(ACK_KEY) === '1';
  } catch {
    // Private browsing — the notice reappears next visit, which is acceptable.
    return false;
  }
}

// During SSR, render the slim banner rather than the modal so the dialog never
// flashes over the dashboard of someone who already dismissed it.
const acknowledgedOnServer = () => true;

function acknowledge(): void {
  try {
    window.localStorage.setItem(ACK_KEY, '1');
  } catch {
    /* ignore */
  }
  listeners.forEach((listener) => listener());
}

export function DataAccuracyNotice() {
  const acknowledged = useSyncExternalStore(subscribe, isAcknowledged, acknowledgedOnServer);

  if (!acknowledged) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="disclaimer-title"
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
      >
        <div className="w-full max-w-md rounded-[var(--radius-xl)] bg-surface-raised p-6 shadow-[var(--shadow-card-hover)]">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning-bg text-warning-fg">
              <AlertTriangle size={18} />
            </span>
            <div className="flex flex-col gap-2">
              <h2 id="disclaimer-title" className="text-base font-bold text-foreground">
                {he.disclaimer.title}
              </h2>
              <p className="text-sm text-muted">{he.disclaimer.body}</p>
              <p className="text-sm font-medium text-foreground">{he.disclaimer.action}</p>
            </div>
          </div>
          <Button className="mt-5 w-full" size="lg" onClick={acknowledge}>
            <Check size={17} />
            {he.disclaimer.acknowledge}
          </Button>
        </div>
      </div>
    );
  }

  // Permanent, low-noise reminder once acknowledged.
  return (
    <div className="flex items-center gap-2 rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning-fg">
      <AlertTriangle size={15} className="shrink-0" />
      <span>{he.disclaimer.short}</span>
    </div>
  );
}
