import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { he } from '@/lib/he';
import { Brand } from '../../_components/Brand';
import { PageHeader } from '../../_components/ui/PageHeader';
import { Button } from '../../_components/ui/Button';
import { WhatsAppPanel } from './_components/WhatsAppPanel';

// The panel reads live connection state on the client; nothing here should be
// prerendered against the build stage's placeholder DATABASE_URL.
export const dynamic = 'force-dynamic';

export default function WhatsAppAdminPage() {
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
        <WhatsAppPanel />
      </div>
    </main>
  );
}
