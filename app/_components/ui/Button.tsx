import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary:
    'text-white bg-primary-600 hover:bg-primary-500 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] focus-visible:ring-primary-300',
  secondary:
    'text-foreground bg-surface-sunken hover:bg-border-strong border border-border focus-visible:ring-primary-300',
  ghost: 'text-muted hover:text-foreground hover:bg-surface-sunken focus-visible:ring-primary-300',
  danger:
    'text-white bg-danger-fg hover:opacity-90 shadow-[var(--shadow-card)] focus-visible:ring-danger-fg',
};

const sizes: Record<Size, string> = {
  md: 'px-4 py-2 text-sm gap-1.5',
  lg: 'px-5 py-3 text-base gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--radius-md)] font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
