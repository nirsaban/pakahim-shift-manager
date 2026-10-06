'use client';

import { useState, type ReactNode } from 'react';
import { CircleCheck, FileText, Info, TriangleAlert, UploadCloud } from 'lucide-react';
import { he } from '@/lib/he';
import { cn } from '@/lib/utils/cn';
import type { DriverRosterSummary, RosterKind } from '@/lib/services/driver-roster-service';
import type { WeeklyRosterSummary } from '@/lib/services/driver-weekly-service';
import { Card } from '../../../_components/ui/Card';
import { Button } from '../../../_components/ui/Button';

/**
 * Pick the PDF, check it, then publish. Checking runs the same import with
 * publish=false, so the preview is exactly what publishing will write. `kind`
 * is the report the admin chose; the server refuses a file of the other kind.
 */
export function RosterUpload({ kind }: { kind: RosterKind }) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [summary, setSummary] = useState<DriverRosterSummary | WeeklyRosterSummary | null>(null);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'checking' | 'publishing' | null>(null);

  function choose(next: File | null) {
    setFile(next);
    setSummary(null);
    setPublished(false);
    setError('');
  }

  async function send(publish: boolean) {
    if (!file) return;
    setError('');
    setBusy(publish ? 'publishing' : 'checking');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('publish', String(publish));
      form.append('kind', kind);
      const res = await fetch('/api/drivers/roster', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? he.error.serverError);
        return;
      }
      setSummary(data);
      setPublished(publish);
    } catch {
      setError(he.error.networkError);
    } finally {
      setBusy(null);
    }
  }

  const t = he.drivers.upload;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="flex flex-col gap-4">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              choose(e.dataTransfer.files?.[0] ?? null);
            }}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-3 rounded-[var(--radius-md)] border-2 border-dashed px-6 py-10 text-center transition-colors',
              dragOver ? 'border-primary-500 bg-primary-500/10' : 'border-border-strong bg-surface-sunken',
              file && 'border-primary-500',
            )}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised text-primary-600 shadow-[var(--shadow-card)]">
              {file ? <FileText size={22} /> : <UploadCloud size={22} />}
            </span>
            <div>
              <p className="text-sm font-medium break-all text-foreground">{file ? file.name : t.chooseFile}</p>
              <p className="mt-0.5 text-xs text-muted">{file ? t.replaceFile : t.dropHint}</p>
            </div>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => choose(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>

          {error && (
            <p className="flex items-center gap-1.5 text-sm text-danger-fg">
              <TriangleAlert size={14} className="shrink-0" />
              {error}
            </p>
          )}

          {published && summary ? (
            <p className="flex items-center gap-1.5 text-sm font-medium text-success-fg">
              <CircleCheck size={16} className="shrink-0" />
              {t.published(summary.kind === 'weekly' ? summary.range : summary.date)}
            </p>
          ) : summary ? (
            <Button type="button" size="lg" disabled={busy !== null} onClick={() => send(true)} className="w-full">
              <UploadCloud size={17} />
              {busy === 'publishing' ? t.publishing : t.publish}
            </Button>
          ) : (
            <Button type="button" size="lg" disabled={!file || busy !== null} onClick={() => send(false)} className="w-full">
              {busy === 'checking' ? t.checking : t.preview}
            </Button>
          )}
        </div>
      </Card>

      {summary?.kind === 'weekly' && <WeeklySummary summary={summary} />}
      {summary?.kind === 'daily' && <Summary summary={summary} published={published} />}
    </div>
  );
}

function Summary({ summary, published }: { summary: DriverRosterSummary; published: boolean }) {
  const t = he.drivers.upload;
  const counts: [string, number][] = [
    [t.rows, summary.rowCount],
    [t.newShifts, summary.newShiftCount],
    [t.updatedShifts, summary.updatedShiftCount],
    [t.removedShifts, summary.removedShiftCount],
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">{t.summaryTitle(summary.date)}</h2>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {counts.map(([label, value]) => (
          <div key={label} className="rounded-[var(--radius-md)] bg-surface-sunken px-3 py-2">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="text-xl font-semibold text-foreground tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {!published && summary.updatedShiftCount > 0 && <Notice tone="info">{t.reuploadNote}</Notice>}
      {summary.skippedSections.length > 0 && (
        <Notice tone="info">{t.skippedSections(summary.skippedSections.join(', '))}</Notice>
      )}
      {summary.newDrivers.length > 0 && (
        <Notice tone="warning">
          <p>{t.newDrivers}</p>
          <ul className="mt-1 list-disc ps-5 text-xs">
            {summary.newDrivers.map((d) => (
              <li key={d.workerNumber}>
                {d.name} ({d.workerNumber})
              </li>
            ))}
          </ul>
        </Notice>
      )}
      {summary.warnings.length > 0 && (
        <Notice tone="warning">
          <p>{t.warnings}</p>
          <ul className="mt-1 list-disc ps-5 text-xs">
            {summary.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Notice>
      )}

      <Card className="p-0">
        <ul className="max-h-[32rem] divide-y divide-border overflow-y-auto">
          {summary.rows.map((row) => (
            <li key={row.serial} className="flex flex-col gap-0.5 px-4 py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium text-foreground">
                  <span className="me-2 text-xs text-muted tabular-nums">{row.serial}</span>
                  {row.name}
                </span>
                <span className="shrink-0 text-sm text-foreground tabular-nums" dir="ltr">
                  {row.start}–{row.end}
                </span>
              </div>
              <p className="text-xs text-muted">
                {[row.originStation, row.task].filter(Boolean).join(' · ')}
                {row.companion && <span className="block">{row.companion}</span>}
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Notice({ tone, children }: { tone: 'info' | 'warning'; children: ReactNode }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-[var(--radius-md)] px-4 py-3 text-sm',
        tone === 'info' ? 'bg-info-bg text-info-fg' : 'bg-warning-bg text-warning-fg',
      )}
    >
      {tone === 'info' ? <Info size={16} className="mt-0.5 shrink-0" /> : <TriangleAlert size={16} className="mt-0.5 shrink-0" />}
      <div>{children}</div>
    </div>
  );
}

/** The weekly link report's preview: a line per day, and the names it could not be sure of. */
function WeeklySummary({ summary }: { summary: WeeklyRosterSummary }) {
  const t = he.drivers.upload;
  const w = t.weekly;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium text-muted">{w.detected}</p>
        <h2 className="text-lg font-semibold text-foreground">{w.summaryTitle(summary.range)}</h2>
        <p className="text-sm text-muted">{w.drivers(summary.matchedCount, summary.driverCount)}</p>
      </div>

      <Card className="p-0">
        <ul className="divide-y divide-border">
          {summary.days.map((day) => (
            <li key={day.date} className="flex flex-col gap-0.5 px-4 py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium text-foreground">{day.label}</span>
                <span className="text-sm text-muted">{w.day(day.shiftCount, day.restCount)}</span>
              </div>
              <p className={day.skippedForDaily ? 'text-xs text-warning-fg' : 'text-xs text-muted'}>
                {day.skippedForDaily
                  ? w.skippedForDaily
                  : w.changes(day.newShiftCount, day.updatedShiftCount, day.removedShiftCount)}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      {summary.days.some((d) => d.skippedForDaily) && <Notice tone="info">{w.dailyWins}</Notice>}

      {summary.unmatched.length > 0 && (
        <Notice tone="warning">
          <p>{w.unmatched}</p>
          <ul className="mt-1 list-disc ps-5 text-xs">
            {summary.unmatched.map((u) => (
              <li key={u.link}>
                {u.link} · {u.name || w.noName}
                {u.reason === 'ambiguous' && ` (${w.ambiguous})`}
              </li>
            ))}
          </ul>
        </Notice>
      )}

      {summary.nearMatches.length > 0 && (
        <Notice tone="info">
          <p>{w.nearMatches}</p>
          <ul className="mt-1 list-disc ps-5 text-xs">
            {summary.nearMatches.map((m) => (
              <li key={m.name}>
                {m.name} ← {m.matchedName}
              </li>
            ))}
          </ul>
        </Notice>
      )}

      {summary.warnings.length > 0 && (
        <Notice tone="warning">
          <p>{t.warnings}</p>
          <ul className="mt-1 list-disc ps-5 text-xs">
            {summary.warnings.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </Notice>
      )}
    </div>
  );
}
