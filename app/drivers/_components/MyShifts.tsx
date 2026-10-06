import type { ReactNode } from 'react';
import { ArrowLeftRight, CalendarClock, MapPin, MessageCircle, Radio, UserRound } from 'lucide-react';
import { he } from '@/lib/he';
import { formatIsraelTime } from '@/lib/time/zone';
import { toWhatsAppLink } from '@/lib/utils/whatsapp';
import { isOnShift, relativeDayLabel } from '@/lib/driver-roster/display';
import type { DriverShiftView } from '@/lib/services/driver-home-service';
import { Card, CardHeader } from '../../_components/ui/Card';
import { HandoffList, type HandoffView } from './HandoffList';
import { TrainChips } from './TrainChips';
import { Badge } from '../../_components/ui/Badge';
import { EmptyState } from '../../_components/ui/EmptyState';

const span = (s: DriverShiftView) => `${formatIsraelTime(s.startTime)}–${formatIsraelTime(s.endTime)}`;

/** The driver's next shift in full, then the ones after it in a line each. */
export function MyShifts({
  shifts,
  now,
  handoffs,
}: {
  shifts: DriverShiftView[];
  now: Date;
  /** Handoffs of the first shift shown; absent when its day could not be read. */
  handoffs?: { takesOverFrom: HandoffView[]; handsOverTo: HandoffView[] };
}) {
  const t = he.drivers.home;
  const [next, ...later] = shifts;

  if (!next) {
    return (
      <Card>
        <CardHeader title={t.myShift} icon={<CalendarClock size={18} />} />
        <EmptyState icon={<CalendarClock size={28} />}>{t.noShift}</EmptyState>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={t.myShift}
        icon={<CalendarClock size={18} />}
        action={
          next.status === 'SICK' || next.status === 'HOLIDAY' ? (
            <Badge tone="warning">{next.status === 'SICK' ? he.dashboard.onSickLeave : he.dashboard.onHoliday}</Badge>
          ) : isOnShift(next, now) ? (
            <Badge tone="success">{t.onShiftNow}</Badge>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm text-muted">{relativeDayLabel(next.date, now)}</p>
          <p className="text-3xl font-bold text-foreground tabular-nums" dir="ltr">
            {span(next)}
          </p>
        </div>

        {next.replacement && <Replacement replacement={next.replacement} />}

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Detail icon={<MapPin size={14} />} label={t.origin} value={next.originStation} />
          <Detail icon={<Radio size={14} />} label={t.mirs} value={next.mirs} />
        </dl>

        <TrainChips task={next.task} fallback={next.trainNumbers} />

        {next.task && (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted">
              {t.task}
              {next.serial !== null && ` · ${t.row(next.serial)}`}
              {next.link && ` · ${t.link(next.link)}`}
            </p>
            <p className="text-sm leading-relaxed text-foreground">{next.task}</p>
          </div>
        )}

        {handoffs && (
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ArrowLeftRight size={15} />
              {he.drivers.handoffs.title}
            </p>
            <HandoffList takesOverFrom={handoffs.takesOverFrom} handsOverTo={handoffs.handsOverTo} person="me" />
            <p className="text-xs text-muted">{he.drivers.handoffs.note}</p>
          </div>
        )}

        {next.companion && (
          <p className="flex items-center gap-2 rounded-[var(--radius-md)] bg-info-bg px-3.5 py-2.5 text-sm text-info-fg">
            <UserRound size={16} className="shrink-0" />
            <span>
              {next.companion.role} {next.companion.name}
              {next.companion.workerNumber && ` (${next.companion.workerNumber})`}
              {next.companion.mirs && ` · ${t.companionMirs(next.companion.mirs)}`}
            </span>
          </p>
        )}

        {later.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-border pt-3">
            <p className="text-xs font-medium text-muted">{t.nextShifts}</p>
            <ul className="flex flex-col">
              {later.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                  <span className="text-foreground">
                    {relativeDayLabel(s.date, now)}
                    {s.originStation && <span className="text-muted"> · {s.originStation}</span>}
                  </span>
                  <span className="font-medium text-foreground tabular-nums" dir="ltr">
                    {span(s)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

/** Who covers this shift, with a WhatsApp link - as on the פקחים shift card. */
function Replacement({ replacement }: { replacement: NonNullable<DriverShiftView['replacement']> }) {
  const link = toWhatsAppLink(replacement.phone);
  return (
    <div className="flex flex-col gap-1 rounded-[var(--radius-md)] bg-warning-bg p-3.5 text-warning-fg">
      <p className="text-xs font-medium">{he.dashboard.replacement}</p>
      <p className="font-semibold">{replacement.name}</p>
      <p className="flex items-center gap-1 text-sm">
        <MapPin size={13} />
        {replacement.city ?? he.dashboard.locationUnknown}
      </p>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-flex w-fit items-center gap-1.5 rounded-[var(--radius-md)] bg-[#25D366] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <MessageCircle size={15} />
          {he.dashboard.contactViaWhatsapp}
        </a>
      )}
    </div>
  );
}

function Detail({ icon, label, value }: { icon: ReactNode; label: string; value: string | null }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-surface-sunken px-3 py-2">
      <dt className="flex items-center gap-1.5 text-xs text-muted">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 font-semibold text-foreground">{value ?? '—'}</dd>
    </div>
  );
}
