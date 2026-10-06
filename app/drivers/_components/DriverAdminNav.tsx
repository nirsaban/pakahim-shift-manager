import Link from 'next/link';
import { CalendarDays, CalendarRange, History, ShieldCheck, Users, UsersRound } from 'lucide-react';
import { he } from '@/lib/he';
import { Card, CardHeader } from '../../_components/ui/Card';
import { Button } from '../../_components/ui/Button';

/** The roster admin's tools - the drivers' counterpart of the פקחים admin panel. */
export function DriverAdminNav() {
  const t = he.drivers.admin;
  return (
    <Card>
      <CardHeader title={t.title} icon={<ShieldCheck size={16} />} />
      <div className="grid grid-cols-2 gap-2">
        {/* Both are allowed; the daily always wins a day the weekly also covers. */}
        <Link href="/drivers/upload?kind=daily">
          <Button size="lg" className="w-full">
            <CalendarDays size={17} />
            {he.drivers.home.uploadDaily}
          </Button>
        </Link>
        <Link href="/drivers/upload?kind=weekly">
          <Button size="lg" className="w-full">
            <CalendarRange size={17} />
            {he.drivers.home.uploadWeekly}
          </Button>
        </Link>
        <Link href="/drivers/team">
          <Button size="lg" variant="secondary" className="w-full">
            <UsersRound size={17} />
            {t.team}
          </Button>
        </Link>
        <Link href="/drivers/manage">
          <Button size="lg" variant="secondary" className="w-full">
            <Users size={17} />
            {t.manage}
          </Button>
        </Link>
        <Link href="/drivers/uploads" className="col-span-2">
          <Button size="lg" variant="secondary" className="w-full">
            <History size={17} />
            {t.uploads}
          </Button>
        </Link>
      </div>
    </Card>
  );
}
