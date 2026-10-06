import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { relativeDayLabel } from '@/lib/driver-roster/display';
import { formatIsraelDate } from '@/lib/time/zone';
import { dayParam } from '@/lib/services/driver-views-service';
import { rosterHref } from './links';

/** "היום · 6.10" - which roster day a train or station page is about, linking to that day's roster. */
export function DayContext({ day, now }: { day: Date; now: Date }) {
  return (
    <Link href={rosterHref(dayParam(day))} className="inline-flex items-center gap-1.5 text-sm text-muted underline-offset-2 hover:underline">
      <CalendarDays size={14} />
      {relativeDayLabel(day, now)} · {formatIsraelDate(day, { day: 'numeric', month: 'numeric' })}
    </Link>
  );
}
