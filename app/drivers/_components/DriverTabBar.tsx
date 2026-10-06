'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Home, Settings, ShieldCheck, TrainFront, Users } from 'lucide-react';
import { he } from '@/lib/he';
import { cn } from '@/lib/utils/cn';

/**
 * The drivers' bottom tab bar - the way around their pages on a phone. The
 * last tab is the roster admin's tools for him, settings for everyone else.
 */
export function DriverTabBar({ admin }: { admin: boolean }) {
  const pathname = usePathname();
  const t = he.drivers.nav;
  const tabs = [
    { href: '/drivers', label: t.home, icon: Home, exact: true },
    // Exact: /drivers/shifts/[id] is anyone's shift, opened from the roster too.
    { href: '/drivers/shifts', label: t.shifts, icon: CalendarDays, exact: true },
    { href: '/drivers/roster', label: t.roster, icon: TrainFront },
    { href: '/drivers/people', label: t.people, icon: Users },
    admin
      ? { href: '/drivers/admin', label: t.admin, icon: ShieldCheck }
      : { href: '/settings', label: t.settings, icon: Settings },
  ];

  return (
    <nav
      aria-label={t.label}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-2xl grid-cols-5">
        {tabs.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
                  active ? 'text-primary-600' : 'text-muted hover:text-foreground',
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
