'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, FileSpreadsheet, UploadCloud, CircleCheck, TriangleAlert, Info, CalendarDays } from 'lucide-react';
import { he } from '@/lib/he';
import { Brand } from '../../_components/Brand';
import { PageHeader } from '../../_components/ui/PageHeader';
import { Card } from '../../_components/ui/Card';
import { Button } from '../../_components/ui/Button';
import { cn } from '@/lib/utils/cn';

interface DayResult {
  date: string;
  importedCount: number;
  skippedCount: number;
}

interface CoverageWipe {
  total: number;
  byDate: { date: string; count: number }[];
}

/** yyyy-mm-dd from the API, rendered as the weekday+date an admin recognises. */
function dayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('he-IL', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  });
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [days, setDays] = useState<DayResult[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [confirmCoverageWipe, setConfirmCoverageWipe] = useState<CoverageWipe | null>(null);

  async function submit(confirmClearCoverage: boolean) {
    if (!file) return;
    setError('');
    setMessage('');
    setDays([]);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (confirmClearCoverage) formData.append('confirmClearCoverage', 'true');
      const res = await fetch('/api/uploads', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.status === 409 && data.needsConfirmation) {
        setConfirmCoverageWipe({ total: data.activeCoverageCount, byDate: data.coverageByDate ?? [] });
        return;
      }
      if (!res.ok) {
        setError(data.error ?? he.admin.importFailed);
        return;
      }
      setConfirmCoverageWipe(null);
      const skipNote = data.skippedCount > 0 ? ` (${data.skippedCount} שורות דולגו)` : '';
      setMessage(`${he.admin.importSuccess} - ${data.importedCount} משמרות${skipNote}`);
      setDays(data.days ?? []);
      setFile(null);
    } catch {
      setError(he.error.networkError);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await submit(false);
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 pb-10">
      <PageHeader>
        <Brand size="compact" />
        <Link href="/dashboard">
          <Button variant="ghost" size="md">
            {he.button.back}
            <ArrowRight size={16} className="rtl:rotate-180" />
          </Button>
        </Link>
      </PageHeader>

      <div className="flex flex-col gap-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{he.admin.uploadSchedule}</h1>
          <p className="mt-1 text-sm text-muted">חוברת התורנות מהמחלקה - ליום אחד או למספר ימים</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) setFile(dropped);
              }}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-3 rounded-[var(--radius-md)] border-2 border-dashed px-6 py-10 text-center transition-colors',
                dragOver ? 'border-primary-500 bg-primary-500/10' : 'border-border-strong bg-surface-sunken',
                file && 'border-primary-500'
              )}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised text-primary-600 shadow-[var(--shadow-card)]">
                {file ? <FileSpreadsheet size={22} /> : <UploadCloud size={22} />}
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {file ? file.name : he.admin.selectFile}
                </p>
                {!file && <p className="mt-0.5 text-xs text-muted">xlsx / xls · גרור לכאן או לחץ לבחירה</p>}
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                required
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>

            {confirmCoverageWipe !== null && (
              <div className="flex flex-col gap-2 rounded-[var(--radius-md)] bg-warning-bg p-3.5 text-sm text-warning-fg">
                <p className="flex items-center gap-1.5 font-medium">
                  <TriangleAlert size={14} className="shrink-0" />
                  {he.admin.reuploadWillClearCoverage} ({confirmCoverageWipe.total})
                </p>
                {/* A multi-day file can wipe coverage on days the admin was not
                    even thinking about - name each one before they confirm. */}
                {confirmCoverageWipe.byDate.length > 0 && (
                  <ul className="flex flex-col gap-0.5 ps-5 text-xs">
                    {confirmCoverageWipe.byDate.map((entry) => (
                      <li key={entry.date} className="list-disc">
                        {he.admin.reuploadCoverageOnDate(dayLabel(entry.date), entry.count)}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2">
                  <Button type="button" size="md" variant="danger" onClick={() => submit(true)}>
                    {he.button.submit}
                  </Button>
                  <Button type="button" size="md" variant="secondary" onClick={() => setConfirmCoverageWipe(null)}>
                    {he.button.cancel}
                  </Button>
                </div>
              </div>
            )}
            {error && (
              <p className="flex items-center gap-1.5 text-sm text-danger-fg">
                <TriangleAlert size={14} className="shrink-0" />
                {error}
              </p>
            )}
            {message && (
              <p className="flex items-center gap-1.5 text-sm text-success-fg">
                <CircleCheck size={14} className="shrink-0" />
                {message}
              </p>
            )}
            {days.length > 0 && (
              <div className="flex flex-col gap-1.5 rounded-[var(--radius-md)] bg-surface-sunken p-3.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
                  <CalendarDays size={14} className="shrink-0" />
                  {he.admin.importedDaysTitle} · {he.admin.importedDaysCount(days.length)}
                </p>
                <ul className="flex flex-col">
                  {days.map((day) => (
                    <li
                      key={day.date}
                      className="flex items-center justify-between gap-3 border-t border-border py-1.5 text-sm first:border-0"
                    >
                      <span className="font-medium text-foreground">{dayLabel(day.date)}</span>
                      <span className="text-muted">
                        {day.importedCount} משמרות
                        {day.skippedCount > 0 && ` · ${day.skippedCount} דולגו`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button type="submit" size="lg" disabled={loading || !file} className="w-full">
              <UploadCloud size={17} />
              {he.admin.uploadFile}
            </Button>
          </form>
        </Card>

        <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] bg-info-bg px-4 py-3 text-sm text-info-fg">
          <Info size={16} className="mt-0.5 shrink-0" />
          <p>{he.admin.uploadMultiDayHint}</p>
        </div>
      </div>
    </main>
  );
}
