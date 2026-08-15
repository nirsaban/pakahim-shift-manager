import { ArrowLeftRight, MapPin, MessageCircle, Route, TrainFront, Wrench } from 'lucide-react';
import { he, opLabel, transportLabel } from '@/lib/he';
import { toWhatsAppLink } from '@/lib/utils/whatsapp';
import type { HandoffPair, HandoffPartner } from '@/lib/services/worker-shift-service';
import { lineNameHe, stationNameHe } from '@/lib/services/worker-shift-service';
import { Card, CardHeader } from '../../_components/ui/Card';
import { Badge } from '../../_components/ui/Badge';

type Leg = {
  seq: number;
  kind: string;
  isDuty: boolean;
  trainNumber: string | null;
  lineCode: string | null;
  isServiceMove: boolean;
  opCode: string | null;
  opOperands: string[];
  atMinutes: number | null;
  fromStation: string | null;
  toStation: string | null;
};

type Duty = {
  serial: string;
  routeNote: string | null;
  shiftString: string;
  startStation: string | null;
  endStation: string | null;
  finalStation: string | null;
  startTransport: string;
  endTransport: string;
  legs: Leg[];
};

function hhmm(minutes: number | null): string {
  if (minutes === null) return '--:--';
  const h = Math.floor(minutes / 60) % 24;
  return `${String(h).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-border py-2 first:border-0 first:pt-0">
      <span className="shrink-0 text-sm text-muted">{label}</span>
      <span className="text-end text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

/** Who the inspector relieves / is relieved by — the thing the raw file cannot tell them. */
function HandoffRow({ title, partner }: { title: string; partner: HandoffPartner | null }) {
  if (!partner) return null;
  const link = partner.person?.phone ? toWhatsAppLink(partner.person.phone) : null;

  return (
    <div className="flex flex-col gap-1.5 rounded-[var(--radius-md)] bg-surface-sunken p-3">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{title}</span>
      <span className="font-semibold text-foreground">
        {partner.person?.name ?? `${he.roster.myShift.serial} ${partner.serial}`}
      </span>
      <span className="text-sm text-muted">
        {he.roster.myShift.onTrain} {partner.trainNumber}
        {partner.stationNameHe ? ` · ${he.roster.myShift.atStation} ${partner.stationNameHe}` : ''}
        {` · ${he.roster.myShift.atTime} ${hhmm(partner.atMinutes)}`}
      </span>
      {partner.person?.city && (
        <span className="flex items-center gap-1 text-sm text-muted">
          <MapPin size={13} />
          {partner.person.city}
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
    </div>
  );
}

/**
 * The parsed detail for a single shift: where it starts and ends, how the
 * inspector gets there, which trains they actually work, and who they hand over
 * to. Everything here is derived from the roster's shift string — the raw code
 * is shown at the bottom so it can be checked against the original file.
 */
export function ShiftDetail(props: {
  duty: Duty | null;
  takesOverFrom: HandoffPartner | null;
  handsOverTo: HandoffPartner | null;
}) {
  if (!props.duty) return null;

  return (
    <Card>
      <CardHeader title={he.roster.myShift.details} icon={<Route size={16} />} />
      <ShiftDetailBody {...props} />
    </Card>
  );
}

/**
 * The same detail without the card around it, for embedding in a list row.
 *
 * Split out when the detail stopped being something only the current shift got:
 * every shift in the schedule, and the one just finished, open out to exactly
 * this — a worker asking "what did I actually do yesterday" gets the same
 * answer as the one asking about right now.
 */
export function ShiftDetailBody({
  duty,
  takesOverFrom,
  handsOverTo,
}: {
  duty: Duty | null;
  takesOverFrom: HandoffPartner | null;
  handsOverTo: HandoffPartner | null;
}) {
  if (!duty) return null;

  const dutyTrains = duty.legs.filter((l) => l.kind === 'TRAIN' && l.isDuty);
  const transitTrains = duty.legs.filter((l) => l.kind === 'TRANSIT');
  const ops = duty.legs.filter((l) => l.kind === 'OPS' || l.kind === 'STANDBY' || l.kind === 'INSPECTION');
  const taxis = duty.legs.filter((l) => l.kind === 'TAXI');

  const firstDuty = dutyTrains[0] ?? null;
  const lastDuty = dutyTrains[dutyTrains.length - 1] ?? null;

  const lines = [...new Set(dutyTrains.map((l) => lineNameHe(l.lineCode)).filter(Boolean))];

  return (
    <>
      {/* Four distinct points, because conflating them misleads: where to BE,
          where duty actually begins, where it ends, and where you end up. This
          inspector rides 238bt out of Lod, works 629-647, then rides 519bt home
          - "shift starts at Lod" and "shift ends at Hagana" would be describing
          two different journeys. */}
      <div className="flex flex-col">
        <Row label={he.roster.myShift.serial} value={duty.serial} />
        {duty.routeNote && <Row label={he.roster.myShift.route} value={duty.routeNote} />}
        <Row
          label={he.roster.myShift.departFrom}
          value={`${stationNameHe(duty.startStation) ?? he.roster.myShift.unknownStation} · ${transportLabel(duty.startTransport)}`}
        />
        {firstDuty && (
          <Row
            label={he.roster.myShift.dutyStarts}
            value={`${stationNameHe(firstDuty.fromStation) ?? he.roster.myShift.unknownStation} · ${he.roster.myShift.onTrain} ${firstDuty.trainNumber}`}
          />
        )}
        {lastDuty && (
          <Row
            label={he.roster.myShift.dutyEnds}
            value={`${stationNameHe(lastDuty.toStation) ?? he.roster.myShift.unknownStation} · ${he.roster.myShift.onTrain} ${lastDuty.trainNumber}`}
          />
        )}
        <Row
          label={he.roster.myShift.returnTo}
          value={`${stationNameHe(duty.finalStation) ?? he.roster.myShift.unknownStation} · ${transportLabel(duty.endTransport)}`}
        />
        {lines.length > 0 && <Row label={he.roster.myShift.route} value={lines.join(' · ')} />}
      </div>

      {(takesOverFrom || handsOverTo) && (
        <div className="mt-4 flex flex-col gap-3">
          <HandoffRow title={he.roster.myShift.takesOverFrom} partner={takesOverFrom} />
          <HandoffRow title={he.roster.myShift.handsOverTo} partner={handsOverTo} />
        </div>
      )}

      {dutyTrains.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <TrainFront size={15} />
            {he.roster.myShift.trains}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {dutyTrains.map((l) => (
              <Badge key={l.seq} tone="info">
                {l.trainNumber}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {transitTrains.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          <span className="text-sm font-medium text-muted">{he.roster.myShift.transitTrains}</span>
          <div className="flex flex-wrap gap-1.5">
            {transitTrains.map((l) => (
              <Badge key={l.seq} tone="neutral">
                {l.trainNumber}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {(ops.length > 0 || taxis.length > 0) && (
        <div className="mt-3 flex flex-col gap-2">
          <span className="flex items-center gap-1.5 text-sm font-medium text-muted">
            <Wrench size={14} />
            {he.roster.myShift.operations}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {ops.map((l) => (
              <Badge key={l.seq} tone="neutral">
                {l.kind === 'STANDBY'
                  ? he.roster.myShift.standby
                  : opLabel(l.opCode) + (l.opOperands.length ? ` (${l.opOperands.join('→')})` : '')}
              </Badge>
            ))}
            {taxis.map((l) => (
              <Badge key={l.seq} tone="warning">
                {he.roster.myShift.taxiAt} {hhmm(l.atMinutes)} ·{' '}
                {stationNameHe(l.toStation) ?? he.roster.myShift.unknownStation}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* The raw code, so it can be checked against the file it came from. */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-muted">{he.roster.myShift.viewFullCode}</summary>
        <p dir="ltr" className="mt-2 break-all rounded-[var(--radius-md)] bg-surface-sunken p-2.5 text-start font-mono text-xs text-foreground">
          {duty.shiftString}
        </p>
      </details>
    </>
  );
}

/**
 * Compact summary used for the previous / next shift when it is not the main card.
 *
 * It opens out to the full detail when the duty behind it was parsed. The
 * previous shift needed that as much as the current one does: "what was the
 * train I handed over yesterday, and to whom" is asked after the fact, not
 * during, and until now the answer disappeared the moment the shift ended.
 */
export function ShiftSummary({
  title,
  shift,
  tone,
  handoffs,
}: {
  title: string;
  shift: { startTime: Date; endTime: Date; duty: Duty | null } | null;
  tone?: 'muted';
  handoffs?: HandoffPair;
}) {
  return (
    <Card>
      <CardHeader title={title} icon={<ArrowLeftRight size={16} />} />
      {shift ? (
        <div className="flex flex-col gap-1">
          <span className={tone === 'muted' ? 'text-lg font-semibold text-muted' : 'text-lg font-semibold text-foreground'}>
            {shift.startTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
            {' – '}
            {shift.endTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="text-sm text-muted">
            {shift.startTime.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          {shift.duty?.routeNote && <span className="text-sm text-muted">{shift.duty.routeNote}</span>}
          {shift.duty && (
            <span className="text-sm text-muted">
              {stationNameHe(shift.duty.startStation) ?? '—'} → {stationNameHe(shift.duty.endStation) ?? '—'}
            </span>
          )}

          {shift.duty && (
            <details className="mt-1 border-t border-border pt-2">
              <summary className="cursor-pointer text-sm font-medium text-muted">
                {he.schedule.fullDetails}
              </summary>
              <div className="mt-2">
                <ShiftDetailBody
                  duty={shift.duty}
                  takesOverFrom={handoffs?.takesOverFrom ?? null}
                  handsOverTo={handoffs?.handsOverTo ?? null}
                />
              </div>
            </details>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">{he.roster.myShift.noneScheduled}</p>
      )}
    </Card>
  );
}
