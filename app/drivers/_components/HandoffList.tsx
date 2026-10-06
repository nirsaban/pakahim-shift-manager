import type { ReactNode } from 'react';
import { ArrowDownLeft, ArrowUpLeft, Phone } from 'lucide-react';
import { he } from '@/lib/he';
import { formatIsraelTime } from '@/lib/time/zone';
import type { HandoffPartner } from '@/lib/services/driver-home-service';

/** A handoff partner, ready to show: formatted on the server, in Israel time. */
export interface HandoffView {
  name: string;
  phone: string | null;
  /** "רכבת 503 · בתחנת לוד" */
  where: string;
  /** The partner's shift, "05:00–11:55". */
  span: string;
}

export function toHandoffView(p: HandoffPartner): HandoffView {
  return {
    name: p.name,
    phone: p.phone,
    where: he.drivers.handoffs.where(p.trainNumber, p.station),
    span: `${formatIsraelTime(p.startTime)}–${formatIsraelTime(p.endTime)}`,
  };
}

/**
 * Who this shift takes a train over from, and who takes one over from it -
 * with the train, the station and a call button. No hooks, so both the server
 * card and the client day list render it.
 */
export function HandoffList({
  takesOverFrom,
  handsOverTo,
  person,
}: {
  takesOverFrom: HandoffView[];
  handsOverTo: HandoffView[];
  /** "me": my own shift ("אני מחליף את"); "them": someone else's ("מחליף את"). */
  person: 'me' | 'them';
}) {
  const t = he.drivers.handoffs;
  if (takesOverFrom.length === 0 && handsOverTo.length === 0) {
    return <p className="text-sm text-muted">{t.none}</p>;
  }
  const groups: [string, HandoffView[], ReactNode][] = [
    [person === 'me' ? t.takesOverFrom : t.theyTakeOverFrom, takesOverFrom, <ArrowDownLeft key="in" size={14} />],
    [person === 'me' ? t.handsOverTo : t.theyHandOverTo, handsOverTo, <ArrowUpLeft key="out" size={14} />],
  ];

  return (
    <div className="flex flex-col gap-3">
      {groups.map(([title, partners, icon]) =>
        partners.length === 0 ? null : (
          <div key={title} className="flex flex-col gap-1.5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
              {icon}
              {title}
            </p>
            <ul className="flex flex-col gap-1.5">
              {partners.map((p) => (
                <li
                  key={`${title}-${p.name}-${p.where}`}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-surface-sunken px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{p.name}</p>
                    <p className="text-xs text-muted">
                      {p.where} ·{' '}
                      <span className="tabular-nums" dir="ltr">
                        {p.span}
                      </span>
                    </p>
                  </div>
                  {p.phone && (
                    <a
                      href={`tel:${p.phone.replace(/[^\d+]/g, '')}`}
                      aria-label={he.drivers.home.call(p.name)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-raised text-primary-600"
                    >
                      <Phone size={15} />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ),
      )}
    </div>
  );
}
