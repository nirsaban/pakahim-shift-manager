import type { ReactNode } from 'react';

export function EmptyState({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted">
      {icon && <span className="opacity-60">{icon}</span>}
      <p>{children}</p>
    </div>
  );
}
