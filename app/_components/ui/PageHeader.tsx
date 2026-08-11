import type { ReactNode } from 'react';

export function PageHeader({ children }: { children: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 -mx-6 mb-2 flex items-center justify-between gap-3 border-b border-border bg-surface/80 px-6 py-4 backdrop-blur-md">
      {children}
    </header>
  );
}
