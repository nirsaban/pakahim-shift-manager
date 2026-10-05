'use client';

import { useSyncExternalStore } from 'react';
import { parseWorkforce, type Workforce } from '@/lib/auth/workforce';
import { Brand } from '../_components/Brand';
import { DriverLogin } from './_components/DriverLogin';
import { PakahimLogin } from './_components/PakahimLogin';
import { WorkforcePicker } from './_components/WorkforcePicker';

// Remembers which side this device last chose, so a driver is not dropped on
// the פקחים form every time. A convenience only: unreadable storage just means
// the picker starts on פקח, as the page always did. Read through a store, as
// DataAccuracyNotice does, rather than assigned inside an effect.
const WORKFORCE_KEY = 'pakahim.login.workforce';
const listeners = new Set<() => void>();
// Holds a choice made where storage cannot, so the picker still switches.
let overridden: Workforce | null = null;

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

function storedWorkforce(): Workforce {
  try {
    return parseWorkforce(window.localStorage.getItem(WORKFORCE_KEY));
  } catch {
    return 'pakahim';
  }
}

function chooseWorkforce(workforce: Workforce): void {
  try {
    window.localStorage.setItem(WORKFORCE_KEY, workforce);
  } catch {
    // Private mode: `overridden` still carries the choice for this visit.
  }
  overridden = workforce;
  listeners.forEach((listener) => listener());
}

const currentWorkforce = () => overridden ?? storedWorkforce();

export default function LoginPage() {
  const workforce = useSyncExternalStore(subscribe, currentWorkforce, () => 'pakahim' as const);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-sm">
        <Brand />
      </div>
      <WorkforcePicker value={workforce} onChange={chooseWorkforce} />
      {workforce === 'pakahim' ? <PakahimLogin /> : <DriverLogin />}
    </main>
  );
}
