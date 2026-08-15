import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ArrowRight, Radar } from 'lucide-react';
import { he } from '@/lib/he';
import { getDefaultTenantId } from '@/lib/db/tenant';
import { getCommanderSnapshot } from '@/lib/services/commander-service';
import { israelMidnight, startOfIsraelDay } from '@/lib/time/zone';
import { Brand } from '../../_components/Brand';
import { PageHeader } from '../../_components/ui/PageHeader';
import { Card } from '../../_components/ui/Card';
import { Button } from '../../_components/ui/Button';
import { EmptyState } from '../../_components/ui/EmptyState';
import { CommanderBoard } from './_components/CommanderBoard';

/**
 * The operational picture: where every inspector is, right now.
 *
 * Roles are enforced here rather than only in the proxy, which proves a live
 * session and nothing else. This page shows the whole roster with names and
 * phone numbers - the exact thing the worker dashboard was deliberately stripped
 * of - so it is closed to anyone who is not already entitled to see all of it.
 */
const ALLOWED_ROLES = new Set(['TEAM_LEAD', 'SHIBUTZ', 'ADMIN', 'SUPER_ADMIN']);

export default async function CommanderPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const role = (await headers()).get('x-user-role') ?? '';
  if (!ALLOWED_ROLES.has(role)) redirect('/dashboard');

  const { date } = await searchParams;
  const day = parseDate(date) ?? startOfIsraelDay(new Date());

  const tenantId = await getDefaultTenantId();
  const snapshot = await getCommanderSnapshot(tenantId, day);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 pb-10">
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
            <Radar size={22} />
            {he.commander.title}
          </h1>
          <p className="mt-1 text-sm text-muted">{he.commander.subtitle}</p>
        </div>

        {snapshot.duties.length === 0 ? (
          <Card>
            <EmptyState icon={<Radar size={22} />}>{he.commander.noRoster}</EmptyState>
          </Card>
        ) : (
          <CommanderBoard snapshot={snapshot} />
        )}
      </div>
    </main>
  );
}

/** ?date=YYYY-MM-DD, so a shift review can be opened straight onto the day it happened. */
function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return israelMidnight(Number(match[1]), Number(match[2]), Number(match[3]));
}
