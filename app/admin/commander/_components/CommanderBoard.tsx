'use client';

import { useEffect, useMemo, useState } from 'react';
import { Info, MapPin, TrainFront, Users } from 'lucide-react';
import { he } from '@/lib/he';
import { estimatePosition, type EstimatedPosition, type PositionKind } from '@/lib/roster/position';
import type { CommanderDuty, CommanderSnapshot } from '@/lib/services/commander-service';
import { stationNameHe } from '@/lib/reference/station-names';
import { Card, CardHeader } from '../../../_components/ui/Card';
import { Badge } from '../../../_components/ui/Badge';
import { EmptyState } from '../../../_components/ui/EmptyState';
import { Button } from '../../../_components/ui/Button';

/** How often the board re-reads the clock while it is following "now". */
const TICK_MS = 30_000;

function hhmm(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function kindLabel(kind: PositionKind): { text: string; tone: 'success' | 'info' | 'neutral' | 'warning' } {
  switch (kind) {
    case 'DUTY':
      return { text: he.commander.onDuty, tone: 'success' };
    case 'DEADHEAD':
      return { text: he.commander.deadhead, tone: 'info' };
    case 'STANDBY':
      return { text: he.commander.standby, tone: 'neutral' };
    case 'OPERATION':
      return { text: he.commander.operation, tone: 'neutral' };
    case 'TAXI':
      return { text: he.commander.taxi, tone: 'warning' };
    default:
      return { text: he.commander.unknownSegment, tone: 'neutral' };
  }
}

interface Placed {
  duty: CommanderDuty;
  position: EstimatedPosition;
}

/** A bar showing how far through the current leg they are. */
function ProgressBar({ position }: { position: EstimatedPosition }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
      <div
        className={position.confidence === 'STATED' ? 'h-full bg-primary-500' : 'h-full bg-border-strong'}
        style={{ width: `${Math.round(position.progress * 100)}%` }}
      />
    </div>
  );
}

function InspectorRow({ duty, position }: Placed) {
  const label = kindLabel(position.kind);
  const from = stationNameHe(position.fromStation);
  const to = stationNameHe(position.toStation);

  return (
    <li className="flex flex-col gap-1.5 border-t border-border py-2.5 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-foreground">
          {duty.name ?? `${he.roster.myShift.serial} ${duty.serial}`}
        </span>
        <div className="flex items-center gap-1.5">
          {position.trainNumber && <Badge tone="info">{position.trainNumber}</Badge>}
          <Badge tone={label.tone}>{label.text}</Badge>
        </div>
      </div>

      <span className="text-sm text-muted">
        {from ?? '—'} → {to ?? '—'}
        {duty.startMinutes !== null && duty.endMinutes !== null && (
          <span className="tabular-nums">
            {' · '}
            {hhmm(duty.startMinutes)}–{hhmm(duty.endMinutes)}
          </span>
        )}
      </span>

      <ProgressBar position={position} />

      {duty.handsOverTo && (
        <span className="text-xs text-muted">
          {he.commander.handsOverTo} {duty.handsOverTo.name ?? `#${duty.handsOverTo.serial}`} ·{' '}
          {he.roster.myShift.onTrain} {duty.handsOverTo.trainNumber} · {hhmm(duty.handsOverTo.atMinutes)}
        </span>
      )}
    </li>
  );
}

/**
 * Where every inspector is right now, and where they were at any minute of the
 * day the slider is dragged to.
 *
 * Grouped two ways because the two questions are different: "who is on train
 * 6716" is asked when something happens to a train, and "who is at ההגנה" is
 * asked when something happens at a station. Everything is recomputed in the
 * browser from one payload, so dragging the slider is instant.
 */
export function CommanderBoard({ snapshot }: { snapshot: CommanderSnapshot }) {
  const [followNow, setFollowNow] = useState(snapshot.nowMinutes !== null);
  const [minute, setMinute] = useState(snapshot.nowMinutes ?? 8 * 60);
  const [groupBy, setGroupBy] = useState<'train' | 'station'>('train');

  // While following "now", the board re-reads the clock rather than the server:
  // the roster it is drawing from does not change during a shift.
  useEffect(() => {
    if (!followNow || snapshot.nowMinutes === null) return;
    const tick = () => {
      const now = new Date();
      setMinute(now.getHours() * 60 + now.getMinutes());
    };
    tick();
    const timer = setInterval(tick, TICK_MS);
    return () => clearInterval(timer);
  }, [followNow, snapshot.nowMinutes]);

  const placed = useMemo<Placed[]>(
    () =>
      snapshot.duties
        .map((duty) => {
          const position = estimatePosition(duty, minute);
          return position ? { duty, position } : null;
        })
        .filter((p): p is Placed => p !== null),
    [snapshot.duties, minute],
  );

  const groups = useMemo(() => {
    const byKey = new Map<string, Placed[]>();
    for (const entry of placed) {
      const key =
        groupBy === 'train'
          ? (entry.position.trainNumber ?? '—')
          : (stationNameHe(entry.position.toStation ?? entry.position.fromStation) ?? '—');
      const bucket = byKey.get(key);
      if (bucket) bucket.push(entry);
      else byKey.set(key, [entry]);
    }
    // Busiest first: an unusual concentration is the thing worth looking at.
    return [...byKey.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, [placed, groupBy]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-foreground">{hhmm(minute)}</span>
            <span className="text-sm text-muted">
              {followNow ? he.commander.now : he.commander.atTime}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!followNow && snapshot.nowMinutes !== null && (
              <Button size="md" variant="secondary" onClick={() => setFollowNow(true)}>
                {he.commander.backToNow}
              </Button>
            )}
            <Button
              size="md"
              variant={groupBy === 'train' ? 'primary' : 'secondary'}
              onClick={() => setGroupBy('train')}
            >
              <TrainFront size={15} />
              {he.commander.byTrain}
            </Button>
            <Button
              size="md"
              variant={groupBy === 'station' ? 'primary' : 'secondary'}
              onClick={() => setGroupBy('station')}
            >
              <MapPin size={15} />
              {he.commander.byStation}
            </Button>
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={24 * 60 - 1}
          step={5}
          value={minute}
          onChange={(event) => {
            setFollowNow(false);
            setMinute(Number(event.target.value));
          }}
          className="mt-4 w-full accent-[var(--color-primary-500)]"
          aria-label={he.commander.atTime}
        />
        <div className="flex justify-between text-xs text-muted tabular-nums">
          <span>00:00</span>
          <span>12:00</span>
          <span>23:59</span>
        </div>

        <p className="mt-3 flex items-start gap-2 rounded-[var(--radius-md)] bg-info-bg px-3 py-2 text-xs text-info-fg">
          <Info size={14} className="mt-0.5 shrink-0" />
          {he.commander.estimateNotice}
        </p>
      </Card>

      <div className="flex items-center justify-between gap-3 px-1">
        <span className="text-sm font-medium text-foreground">{he.commander.activeNow(placed.length)}</span>
        <span className="text-sm text-muted">
          {groupBy === 'train'
            ? he.commander.trainsRunning(groups.length)
            : he.commander.inspectorsAt(placed.length)}
        </span>
      </div>

      {groups.length === 0 ? (
        <Card>
          <EmptyState icon={<Users size={22} />}>{he.commander.noneActive}</EmptyState>
        </Card>
      ) : (
        groups.map(([key, entries]) => (
          <Card key={key}>
            <CardHeader
              title={groupBy === 'train' ? `${he.roster.myShift.onTrain} ${key}` : key}
              icon={groupBy === 'train' ? <TrainFront size={16} /> : <MapPin size={16} />}
              action={<span className="text-xs text-muted">{he.commander.inspectorsAt(entries.length)}</span>}
            />
            <ul className="flex flex-col">
              {entries.map((entry) => (
                <InspectorRow key={entry.duty.dutyId} {...entry} />
              ))}
            </ul>
          </Card>
        ))
      )}
    </div>
  );
}
