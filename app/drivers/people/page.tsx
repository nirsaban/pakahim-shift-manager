import { requireDriver } from '@/lib/auth/driver-page';
import { listDriverPeople } from '@/lib/services/driver-views-service';
import { he } from '@/lib/he';
import { DriverHeader } from '../_components/DriverHeader';
import { PeopleList } from './_components/PeopleList';

/** Every driver, searchable - each opening their page. */
export default async function DriversPeoplePage() {
  const user = await requireDriver();
  const people = await listDriverPeople(user.tenantId);
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6">
      <DriverHeader />
      <div className="flex flex-col gap-4 pt-4">
        <h1 className="text-2xl font-bold text-foreground">{he.drivers.peoplePage.title}</h1>
        <PeopleList people={people} />
      </div>
    </main>
  );
}
