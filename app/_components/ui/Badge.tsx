import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const tones: Record<Tone, string> = {
  success: 'bg-success-bg text-success-fg',
  warning: 'bg-warning-bg text-warning-fg',
  danger: 'bg-danger-bg text-danger-fg',
  info: 'bg-info-bg text-info-fg',
  neutral: 'bg-surface-sunken text-muted',
};

export function Badge({
  tone = 'neutral',
  icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
        tones[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
