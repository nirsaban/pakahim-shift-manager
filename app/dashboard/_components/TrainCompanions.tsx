'use client';

import { useState } from 'react';
import { MapPin, MessageCircle, TrainFront, Users } from 'lucide-react';
import { he } from '@/lib/he';
import { toWhatsAppLink } from '@/lib/utils/whatsapp';
import type { RideDirection } from '@/lib/roster/companions';
import type { TrainWithCompanions } from '@/lib/services/train-companion-service';
import { Card, CardHeader } from '../../_components/ui/Card';
import { Badge } from '../../_components/ui/Badge';
import { EmptyState } from '../../_components/ui/EmptyState';

function hhmm(minutes: number | null): string {
  if (minutes === null) return '--:--';
  const h = Math.floor(minutes / 60) % 24;
  return `${String(h).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function directionLabel(direction: RideDirection): { text: string; tone: 'info' | 'neutral' } {
  switch (direction) {
    case 'TO_SHIFT':
      return { text: he.roster.companions.onTheirWay, tone: 'info' };
    case 'FROM_SHIFT':
      return { text: he.roster.companions.headingHome, tone: 'neutral' };
    default:
      return { text: he.roster.companions.repositioning, tone: 'neutral' };
  }
}

/**
 * Who else is aboard a train this inspector is working.
 *
 * The train picker is the point: an inspector works several trains in a shift
 * and the question is always asked about one of them - "who is in MY train right
 * now" - so a flat list of everyone across the whole duty would be the wrong
 * shape. Trains are listed in the order they are worked, and one with nobody
 * aboard still appears, because "nobody" is an answer.
 */
export function TrainCompanions({ trains }: { trains: TrainWithCompanions[] }) {
  const [selected, setSelected] = useState(0);

  if (trains.length === 0) {
    return (
      <Card>
        <CardHeader title={he.roster.companions.title} icon={<Users size={16} />} />
        <EmptyState icon={<TrainFront size={22} />}>{he.roster.companions.noTrains}</EmptyState>
      </Card>
    );
  }

  const train = trains[Math.min(selected, trains.length - 1)];

  return (
    <Card>
      <CardHeader title={he.roster.companions.title} icon={<Users size={16} />} />
      <p className="text-sm text-muted">{he.roster.companions.subtitle}</p>

      <label className="mt-3 flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">{he.roster.companions.pickTrain}</span>
        <select
          value={selected}
          onChange={(event) => setSelected(Number(event.target.value))}
          className="w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-start text-sm font-medium text-foreground"
        >
          {trains.map((option, index) => (
            <option key={option.trainNumber} value={index}>
              {he.roster.myShift.onTrain} {option.trainNumber}
              {option.fromStationHe || option.toStationHe
                ? ` · ${option.fromStationHe ?? '—'} → ${option.toStationHe ?? '—'}`
                : ''}
              {` · ${
                option.companions.length === 0
                  ? he.roster.companions.nobodyAboard
                  : he.roster.companions.riders(option.companions.length)
              }`}
            </option>
          ))}
        </select>
      </label>

      {train.companions.length === 0 ? (
        <EmptyState icon={<Users size={22} />}>{he.roster.companions.nobodyAboard}</EmptyState>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {train.companions.map((companion) => {
            const label = directionLabel(companion.direction);
            const link = toWhatsAppLink(companion.phone);

            return (
              <li
                key={companion.dutyId}
                className="flex flex-col gap-1.5 rounded-[var(--radius-md)] bg-surface-sunken p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">
                    {companion.name ?? `${he.roster.myShift.serial} ${companion.serial}`}
                  </span>
                  <Badge tone={label.tone}>{label.text}</Badge>
                </div>

                <span className="text-sm text-muted">
                  {companion.boardStationHe && `${he.roster.companions.boardsAt}${companion.boardStationHe} · `}
                  {companion.alightStationHe
                    ? `${he.roster.companions.alightsAt}${companion.alightStationHe}`
                    : he.roster.myShift.unknownStation}
                </span>

                <span className="text-sm text-muted tabular-nums">
                  {he.roster.companions.shiftWindow} {hhmm(companion.startMinutes)} – {hhmm(companion.endMinutes)}
                </span>

                {companion.city && (
                  <span className="flex items-center gap-1 text-sm text-muted">
                    <MapPin size={13} />
                    {companion.city}
                  </span>
                )}

                {link && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-[var(--radius-md)] bg-[#25D366] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  >
                    <MessageCircle size={15} />
                    {he.dashboard.contactViaWhatsapp}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
