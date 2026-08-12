import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { he } from '@/lib/he';
import { getDefaultTenantId } from '@/lib/db/tenant';
import { listTeams, listWorkers } from '@/lib/services/admin-service';
import { Brand } from '../../_components/Brand';
import { PageHeader } from '../../_components/ui/PageHeader';
import { Button } from '../../_components/ui/Button';
import { TeamsPanel } from './_components/TeamsPanel';
import { WorkersPanel } from './_components/WorkersPanel';

export default async function ManagePage() {
  const tenantId = await getDefaultTenantId();
  const [teams, workers] = await Promise.all([listTeams(tenantId), listWorkers(tenantId, {})]);

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
        <TeamsPanel teams={teams} teamLeads={workers.filter((w) => w.role === 'TEAM_LEAD')} />
        <WorkersPanel workers={workers} teams={teams} />
      </div>
    </main>
  );
}
