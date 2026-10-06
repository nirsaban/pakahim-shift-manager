import { requireDriver } from '@/lib/auth/driver-page';
import { getTeamLeadContact } from '@/lib/services/team-service';
import { he } from '@/lib/he';
import { ReportIncidentForm } from '../../dashboard/_components/ReportIncidentForm';
import { DriverHeader } from '../_components/DriverHeader';

/** Report a fault or an emergency - it reaches the drivers' team lead. */
export default async function DriverReportPage() {
  const user = await requireDriver();
  const teamLead = user.teamId ? await getTeamLeadContact(user.teamId) : null;
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6">
      <DriverHeader back />
      <div className="flex flex-col gap-4 pt-4">
        <h1 className="text-2xl font-bold text-foreground">{he.drivers.reportPage.title}</h1>
        <ReportIncidentForm teamLeadPhone={teamLead?.phone} />
      </div>
    </main>
  );
}
