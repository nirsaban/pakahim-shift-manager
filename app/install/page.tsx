import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { he } from '@/lib/he';
import { Brand } from '../_components/Brand';
import { PageHeader } from '../_components/ui/PageHeader';
import { Button } from '../_components/ui/Button';
import { InstallGuide } from './_components/InstallGuide';

export const metadata = {
  title: `${he.pwa.installTitle} - ${he.brand.name}`,
};

export default function InstallPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 pb-10">
      <PageHeader>
        <Brand size="compact" />
        <Link href="/dashboard">
          <Button variant="secondary" size="md">
            <ArrowRight size={15} />
            {he.button.back}
          </Button>
        </Link>
      </PageHeader>

      <div className="flex flex-col gap-2 pt-4">
        <h1 className="text-xl font-bold text-foreground">{he.pwa.installTitle}</h1>
        <p className="text-sm text-muted">{he.pwa.installSubtitle}</p>
      </div>

      <div className="pt-5">
        <InstallGuide />
      </div>
    </main>
  );
}
