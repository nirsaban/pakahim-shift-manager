import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ArrowRight, CircleCheck, Clock, TriangleAlert } from 'lucide-react';
import { he } from '@/lib/he';
import { diagnoseTimezone } from '@/lib/services/timezone-repair-service';
import { Brand } from '../../_components/Brand';
import { PageHeader } from '../../_components/ui/PageHeader';
import { Card, CardHeader } from '../../_components/ui/Card';
import { Badge } from '../../_components/ui/Badge';
import { Button } from '../../_components/ui/Button';
import { RepairButton } from './_components/RepairButton';

const ALLOWED_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

/**
 * "Why are the hours wrong?", answered on screen and fixable from the same page.
 *
 * The underlying fault is described in docs/modules/time-and-zones.md. This page
 * exists because the fault outlived the code fix: rows written by the old
 * importer keep their wrong times until something rewrites them, and the person
 * who notices is looking at a phone, not a shell.
 */
export default async function TimezonePage() {
  const role = (await headers()).get('x-user-role') ?? '';
  if (!ALLOWED_ROLES.has(role)) redirect('/dashboard');

  const d = await diagnoseTimezone();
  const healthy = d.shiftsNeedingRepair === 0 && d.dutiesNeedingRepair === 0 && !d.processZoneWrong;

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
            <Clock size={22} />
            {he.timezone.title}
          </h1>
          <p className="mt-1 text-sm text-muted">{he.timezone.subtitle}</p>
        </div>

        <Card>
          <CardHeader
            title={he.timezone.statusTitle}
            icon={healthy ? <CircleCheck size={16} /> : <TriangleAlert size={16} />}
            action={
              <Badge tone={healthy ? 'success' : 'warning'}>
                {healthy ? he.timezone.healthy : he.timezone.needsRepair}
              </Badge>
            }
          />

          <div className="flex flex-col">
            <Row label={he.timezone.serverClock} value={`${d.processClock} (TZ=${d.processTimeZone ?? '—'})`} />
            <Row label={he.timezone.israelClock} value={d.israelClock} />
            <Row label={he.timezone.shiftsNeedingRepair} value={String(d.shiftsNeedingRepair)} />
            <Row label={he.timezone.shiftsCorrect} value={String(d.shiftsAlreadyCorrect)} />
            <Row label={he.timezone.dutiesNeedingRepair} value={String(d.dutiesNeedingRepair)} />
          </div>

          {d.processZoneWrong && (
            <p className="mt-3 rounded-[var(--radius-md)] bg-warning-bg px-3 py-2 text-sm text-warning-fg">
              {he.timezone.processZoneWarning}
            </p>
          )}
        </Card>

        {d.samples.length > 0 && (
          <Card>
            <CardHeader title={he.timezone.samplesTitle} icon={<TriangleAlert size={16} />} />
            <p className="text-sm text-muted">{he.timezone.samplesSubtitle}</p>
            <ul className="mt-3 flex flex-col">
              {d.samples.map((s) => (
                <li
                  key={s.storedUtc}
                  className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-2 text-sm first:border-0"
                >
                  <span className="text-muted">{s.region ?? '—'}</span>
                  <span className="tabular-nums">
                    <span className="text-danger-fg line-through">{s.showsNow}</span>
                    {' → '}
                    <span className="font-semibold text-foreground">{s.wouldShow}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <CardHeader title={he.timezone.repairTitle} icon={<Clock size={16} />} />
          <p className="mb-3 text-sm text-muted">{he.timezone.repairExplainer}</p>
          <RepairButton pending={d.shiftsNeedingRepair + d.dutiesNeedingRepair} />
        </Card>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-border py-2 first:border-0 first:pt-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}
