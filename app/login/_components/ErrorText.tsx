import { TriangleAlert } from 'lucide-react';

export function ErrorText({ children }: { children: string }) {
  return (
    <p className="flex items-center gap-1.5 text-sm text-danger-fg">
      <TriangleAlert size={14} className="shrink-0" />
      {children}
    </p>
  );
}
