import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { findRosterAdmin } from '@/lib/auth/roster-admin';
import { he } from '@/lib/he';
import { Brand } from '../../_components/Brand';
import { PageHeader } from '../../_components/ui/PageHeader';
import { Button } from '../../_components/ui/Button';
import { RosterUpload } from './_components/RosterUpload';

/** The roster admin's upload screen. Any other driver is sent home. */
export default async function DriverRosterUploadPage() {
  const admin = await findRosterAdmin((await headers()).get('x-user-id'));
  if (!admin) redirect('/drivers');

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-10">
      <PageHeader>
        <Brand size="compact" />
        <Link href="/drivers">
          <Button variant="ghost" size="md">
            <ArrowRight size={15} />
            {he.drivers.upload.backHome}
          </Button>
        </Link>
      </PageHeader>
      <div className="flex flex-col gap-2 pt-4 pb-6">
        <h1 className="text-2xl font-bold text-foreground">{he.drivers.upload.title}</h1>
        <p className="text-sm text-muted">{he.drivers.upload.subtitle}</p>
      </div>
      <RosterUpload />
    </main>
  );
}
