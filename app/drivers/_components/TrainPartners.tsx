import { Phone, TrainFront } from 'lucide-react';
import { he } from '@/lib/he';
import { formatIsraelTime } from '@/lib/time/zone';
import type { TrainPartner } from '@/lib/services/driver-home-service';
import { Card, CardHeader } from '../../_components/ui/Card';

/**
 * The other drivers on this shift's trains - the drivers' counterpart of the
 * פקחים handoffs. Renders nothing when no train is shared.
 */
export function TrainPartners({ trains }: { trains: TrainPartner[] }) {
  if (trains.length === 0) return null;
  const t = he.drivers.trains;

  return (
    <Card>
      <CardHeader title={t.title} icon={<TrainFront size={16} />} />
      <p className="-mt-2 mb-3 text-xs text-muted">{t.subtitle}</p>
      <ul className="flex flex-col">
        {trains.map((train) => (
          <li key={train.trainNumber} className="flex flex-col gap-1.5 border-t border-border py-3 first:border-0 first:pt-0">
            <span className="text-sm font-semibold text-foreground">{t.train(train.trainNumber)}</span>
            <ul className="flex flex-col gap-1">
              {train.drivers.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-foreground">{d.name}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted tabular-nums" dir="ltr">
                      {formatIsraelTime(d.startTime)}–{formatIsraelTime(d.endTime)}
                    </span>
                    {d.phone && (
                      <a
                        href={`tel:${d.phone.replace(/[^\d+]/g, '')}`}
                        aria-label={he.drivers.home.call(d.name)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-sunken text-primary-600"
                      >
                        <Phone size={14} />
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </Card>
  );
}
