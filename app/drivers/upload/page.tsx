import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ArrowRight, CalendarDays, CalendarRange } from 'lucide-react';
import { findRosterAdmin } from '@/lib/auth/roster-admin';
import { parseRosterKind, type RosterKind } from '@/lib/services/driver-roster-service';
import { he } from '@/lib/he';
import { Brand } from '../../_components/Brand';
import { PageHeader } from '../../_components/ui/PageHeader';
import { Button } from '../../_components/ui/Button';
import { RosterUpload } from './_components/RosterUpload';

const KINDS: { kind: RosterKind; icon: typeof CalendarDays }[] = [
  { kind: 'daily', icon: CalendarDays },
  { kind: 'weekly', icon: CalendarRange },
];

/**
 * The roster admin's upload screen: a daily or a weekly roster, chosen
 * explicitly (`?kind=`). Both may be uploaded; the daily always wins a day
 * both cover. Any other driver is sent home.
 */
export default async function DriverRosterUploadPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await findRosterAdmin((await headers()).get('x-user-id'));
  if (!admin) redirect('/drivers');
  const kind = parseRosterKind((await searchParams).kind) ?? 'daily';
  const t = he.drivers.upload;

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
        <p className="text-sm text-muted">{t.subtitle}</p>
      </div>

      <nav aria-label={t.title} className="mb-3 grid grid-cols-2 gap-2">
        {KINDS.map(({ kind: k, icon: Icon }) => (
          <Link key={k} href={`/drivers/upload?kind=${k}`} replace aria-current={k === kind ? 'page' : undefined}>
            <Button variant={k === kind ? 'primary' : 'secondary'} size="lg" className="w-full">
              <Icon size={17} />
              {t.kind[k]}
            </Button>
          </Link>
        ))}
      </nav>
      <p className="mb-5 text-sm text-muted">{t.kindHint[kind]}</p>

      {/* Keyed by kind: switching starts over rather than carrying a file across. */}
      <RosterUpload key={kind} kind={kind} />
    </main>
  );
}
