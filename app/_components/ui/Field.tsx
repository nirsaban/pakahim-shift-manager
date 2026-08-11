import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

const controlClass =
  'w-full rounded-[var(--radius-md)] border border-border bg-surface-sunken px-3.5 py-2.5 text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary-500 focus:bg-surface-raised focus:ring-2 focus:ring-primary-100';

export function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-sm font-medium text-muted">{children}</span>;
}

export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col text-sm">
      <Label>{label}</Label>
      {children}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClass, 'resize-none', className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlClass, className)} {...props} />;
}
