import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { CalendarDays, History } from 'lucide-react';
import { findRosterAdmin } from '@/lib/auth/roster-admin';
import { listUploadRecords } from '@/lib/services/upload-service';
import { formatIsraelDate, formatIsraelDateTime, israelMidnight } from '@/lib/time/zone';
import { he, uploadStatusLabel } from '@/lib/he';
import { Card, CardHeader } from '../../_components/ui/Card';
import { Badge } from '../../_components/ui/Badge';
import { EmptyState } from '../../_components/ui/EmptyState';
import { DriverHeader } from '../_components/DriverHeader';

/** "Sunday, 4 October" for a yyyy-mm-dd roster date. */
function dayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return formatIsraelDate(israelMidnight(y, m, d));
}

/** Every roster file the drivers' admin uploaded, and which dates each wrote - as /admin/uploads. */
export default async function DriversUploadsPage() {
  const admin = await findRosterAdmin((await headers()).get('x-user-id'));
  if (!admin) redirect('/drivers');

  const records = await listUploadRecords(admin.tenantId);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-10">
      <DriverHeader back />
      <div className="flex flex-col gap-6 pt-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <History size={22} />
          {he.admin.uploadHistory}
        </h1>

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
                  <Badge tone={record.status === 'FAILED' ? 'danger' : 'success'}>{uploadStatusLabel(record.status)}</Badge>
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
              </div>
              {record.errorMessage && (
                <p className="mt-2 rounded-[var(--radius-md)] bg-warning-bg px-3 py-2 text-sm text-warning-fg">
                  {record.errorMessage}
                </p>
              )}
              {record.dates.length > 0 && (
                <ul className="mt-3 flex flex-col">
                  {record.dates.map((entry) => (
                    <li
                      key={entry.date}
                      className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-2 text-sm first:border-0"
                    >
                      <span className="font-medium text-foreground">{dayLabel(entry.date)}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-muted">{he.admin.shiftsOnDate(entry.shiftCount)}</span>
                        <Badge tone={entry.isCurrent ? 'success' : 'neutral'}>
                          {entry.isCurrent ? he.admin.currentForDate : he.admin.replacedByLater}
                        </Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
