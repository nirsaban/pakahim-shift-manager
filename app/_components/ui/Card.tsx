import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-border bg-surface-raised p-5 shadow-[var(--shadow-card)] transition-shadow',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  icon,
  action,
  className,
}: {
  title: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3', className)}>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon && <span className="text-muted">{icon}</span>}
        {title}
      </h2>
      {action}
    </div>
  );
}
