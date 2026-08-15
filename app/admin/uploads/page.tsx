import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ArrowRight, CalendarDays, History, Radar, UploadCloud } from 'lucide-react';
import { he } from '@/lib/he';
import { getDefaultTenantId } from '@/lib/db/tenant';
import { listUploadRecords } from '@/lib/services/upload-service';
import { formatIsraelDateTime, israelMidnight } from '@/lib/time/zone';
import { Brand } from '../../_components/Brand';
import { PageHeader } from '../../_components/ui/PageHeader';
import { Card, CardHeader } from '../../_components/ui/Card';
import { Badge } from '../../_components/ui/Badge';
import { Button } from '../../_components/ui/Button';
import { EmptyState } from '../../_components/ui/EmptyState';

const ALLOWED_ROLES = new Set(['SHIBUTZ', 'ADMIN', 'SUPER_ADMIN']);

function uploadStatusLabel(status: string): string {
  switch (status) {
    case 'IMPORTED':
      return 'יובא בהצלחה';
    case 'FAILED':
      return 'נכשל';
    default:
      return status;
  }
}

/** yyyy-mm-dd as the weekday+date an admin recognises from the file itself. */
function dayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return israelMidnight(y, m, d).toLocaleDateString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  });
}

/**
 * Every roster file that was uploaded, and which dates each one wrote.
 *
 * Split off the admin dashboard because the interesting column was missing
 * there: a file is not one date. A weekly workbook writes several, a re-upload
 * silently takes a date away from an older file, and until now the only record
 * of that was a row count. Each date links through to the commander view for it.
 */
export default async function UploadsPage() {
  const role = (await headers()).get('x-user-role') ?? '';
  if (!ALLOWED_ROLES.has(role)) redirect('/dashboard');

  const tenantId = await getDefaultTenantId();
  const records = await listUploadRecords(tenantId);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-10">
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
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <History size={22} />
            {he.admin.uploadHistory}
          </h1>
          <p className="mt-1 text-sm text-muted">{he.admin.uploadHistorySubtitle}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/admin/upload">
            <Button size="md">
              <UploadCloud size={16} />
              {he.admin.uploadSchedule}
            </Button>
          </Link>
        </div>

        {records.length === 0 ? (
          <Card>
            <EmptyState icon={<History size={22} />}>{he.admin.noUploadsYet}</EmptyState>
          </Card>
        ) : (
          records.map((record) => (
            <Card key={record.id}>
              <CardHeader
                title={record.filename}
                icon={<CalendarDays size={16} />}
                action={
                  <Badge tone={record.status === 'FAILED' ? 'danger' : 'success'}>
                    {uploadStatusLabel(record.status)}
                  </Badge>
                }
              />

              <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
                <span>{formatIsraelDateTime(record.createdAt)}</span>
                {record.uploadedByName && (
                  <>
                    <span>&middot;</span>
                    <span>
                      {he.admin.uploadedBy} {record.uploadedByName}
                    </span>
                  </>
                )}
                {record.status === 'IMPORTED' && (
                  <>
                    <span>&middot;</span>
                    <span>{he.admin.shiftsOnDate(record.importedShiftCount)}</span>
                  </>
                )}
              </div>

              {record.errorMessage && (
                <p className="mt-2 rounded-[var(--radius-md)] bg-warning-bg px-3 py-2 text-sm text-warning-fg">
                  {record.errorMessage}
                </p>
              )}

              {record.status === 'IMPORTED' && (
                <div className="mt-3 flex flex-col gap-1.5">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted">
                    {he.admin.datesWritten}
                  </span>

                  {record.dates.length === 0 ? (
                    <p className="text-sm text-muted">{he.admin.noDatesRecorded}</p>
                  ) : (
                    <ul className="flex flex-col">
                      {record.dates.map((entry) => (
                        <li
                          key={entry.date}
                          className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-2 text-sm first:border-0"
                        >
                          <Link
                            href={`/admin/commander?date=${entry.date}`}
                            className="flex items-center gap-1.5 font-medium text-foreground hover:underline"
                          >
                            <Radar size={14} className="shrink-0 text-muted" />
                            {dayLabel(entry.date)}
                          </Link>
                          <div className="flex items-center gap-2">
                            <span className="text-muted">{he.admin.shiftsOnDate(entry.shiftCount)}</span>
                            <Badge tone={entry.isCurrent ? 'success' : 'neutral'}>
                              {entry.isCurrent ? he.admin.currentForDate : he.admin.replacedByLater}
                            </Badge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
