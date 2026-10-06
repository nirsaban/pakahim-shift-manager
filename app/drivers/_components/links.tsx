import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronLeft, MapPin, MessageCircle, Phone } from 'lucide-react';
import { he } from '@/lib/he';
import { cn } from '@/lib/utils/cn';
import { toWhatsAppLink } from '@/lib/utils/whatsapp';
import { NOT_A_STATION } from '@/lib/driver-roster/handoffs';

/**
 * Links between the drivers' pages - a shift, a driver, a train, a station.
 * Whatever is shown about one of them leads to its own page.
 */

export const shiftHref = (id: string) => `/drivers/shifts/${id}`;
export const personHref = (id: string) => `/drivers/people/${id}`;
export const trainHref = (n: string, day: string) => `/drivers/trains/${encodeURIComponent(n)}?day=${day}`;
export const stationHref = (name: string, day: string) => `/drivers/stations/${encodeURIComponent(name)}?day=${day}`;
export const rosterHref = (day: string) => `/drivers/roster?day=${day}`;

/** Whether a task word names a station (and so gets a page), rather than an activity. */
export function isStationName(name: string): boolean {
  return !NOT_A_STATION.has(name) && !/^[A-Za-z]/.test(name) && !/^(מוכן|ערב|בוקר|צהרים|לילה|חשמלי|קטר)$/.test(name);
}

export function PersonLink({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <Link href={personHref(id)} className={cn('font-medium text-foreground underline-offset-2 hover:underline', className)}>
      {children}
    </Link>
  );
}

export function TrainLink({ number, day, passenger, size = 'md' }: { number: string; day: string; passenger?: boolean; size?: 'sm' | 'md' }) {
  return (
    <Link
      href={trainHref(number, day)}
      className={cn(
        'inline-flex items-center rounded-full font-medium tabular-nums transition-colors',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        passenger
          ? 'border border-dashed border-border text-muted hover:border-primary-500 hover:text-foreground'
          : 'bg-surface-sunken text-foreground hover:bg-primary-500/15',
      )}
    >
      {number}
      {passenger && ` · ${he.drivers.home.asPassenger}`}
    </Link>
  );
}

export function StationLink({ name, day, className }: { name: string; day: string; className?: string }) {
  if (!isStationName(name)) return <span className={className}>{name}</span>;
  return (
    <Link
      href={stationHref(name, day)}
      className={cn('inline-flex items-center gap-1 underline-offset-2 hover:underline', className)}
    >
      <MapPin size={13} className="shrink-0 text-muted" />
      {name}
    </Link>
  );
}

/** A tappable row that opens a page: the whole row is the link. */
export function RowLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-sunken active:bg-surface-sunken',
        className,
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <ChevronLeft size={18} className="shrink-0 text-muted" />
    </Link>
  );
}

/** Call and WhatsApp buttons for a phone number. */
export function ContactButtons({ phone, name, compact }: { phone: string | null; name: string; compact?: boolean }) {
  if (!phone) return null;
  const wa = toWhatsAppLink(phone);
  const t = he.drivers.personPage;
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-opacity hover:opacity-90';
  return (
    <div className="flex shrink-0 items-center gap-2">
      <a
        href={`tel:${phone.replace(/[^\d+]/g, '')}`}
        aria-label={he.drivers.home.call(name)}
        className={cn(base, 'bg-surface-sunken text-primary-600', compact ? 'h-9 w-9' : 'px-4 py-2 text-sm')}
      >
        <Phone size={compact ? 15 : 16} />
        {!compact && t.call}
      </a>
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${t.whatsapp} ${name}`}
          className={cn(base, 'bg-[#25D366] text-white', compact ? 'h-9 w-9' : 'px-4 py-2 text-sm')}
        >
          <MessageCircle size={compact ? 15 : 16} />
          {!compact && t.whatsapp}
        </a>
      )}
    </div>
  );
}
