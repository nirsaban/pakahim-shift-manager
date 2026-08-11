import { config } from 'dotenv';

config({ path: '.env.local' });

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function withHour(base: Date, hour: number): Date {
  const copy = new Date(base);
  copy.setHours(hour % 24, 0, 0, 0);
  if (hour >= 24) copy.setDate(copy.getDate() + 1);
  return copy;
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  if (!adminEmail) {
    throw new Error('Set SEED_ADMIN_EMAIL in .env.local before running the seed - it becomes the ADMIN login.');
  }

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: { name: 'Takahim Demo', slug: 'default' },
  });

  const teamLead = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'teamlead@demo.local' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'nirsa11+teamlead@gmail.com',
      firstName: 'רונית',
      lastName: 'כהן',
      city: 'תל אביב',
      workerNumber: 'TL-1',
      role: 'TEAM_LEAD',
    },
  });

  const team = await prisma.team.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'צוות צפון' } },
    update: {},
    create: { tenantId: tenant.id, name: 'צוות צפון', teamLeadId: teamLead.id },
  });

  await prisma.user.update({ where: { id: teamLead.id }, data: { teamId: team.id } });

  const shibutz = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'shibutz@demo.local' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'nirsa11+shibutz@gmail.com',
      firstName: 'דנה',
      lastName: 'לוי',
      city: 'חיפה',
      workerNumber: 'SH-1',
      role: 'SHIBUTZ',
    },
  });

  const maintenance = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'maintenance@demo.local' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'nirsa11+maintenance@gmail.com',
      firstName: 'אלי',
      lastName: 'פרץ',
      city: 'לוד',
      workerNumber: 'MT-1',
      role: 'MAINTENANCE',
    },
  });

  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: adminEmail } },
    update: { role: 'ADMIN' },
    create: {
      tenantId: tenant.id,
      email: adminEmail,
      firstName: 'מנהל',
      lastName: 'מערכת',
      city: 'ירושלים',
      workerNumber: 'AD-1',
      role: 'ADMIN',
    },
  });

  const workerSeeds = [
    { email: 'nirsa11+worker1@gmail.com', firstName: 'יוסי', lastName: 'מזרחי', workerNumber: '1001', city: 'תל אביב', phone: '0501234567' },
    { email: 'nirsa11+worker2@gmail.com', firstName: 'שירה', lastName: 'אברהם', workerNumber: '1002', city: 'רמת גן', phone: '0522345678' },
    { email: 'nirsa11+worker3@gmail.com', firstName: 'אבי', lastName: 'דוד', workerNumber: '1003', city: 'חולון', phone: '0533456789' },
  ];

  const workers = [];
  for (const w of workerSeeds) {
    const worker = await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: w.email } },
      update: { city: w.city, phone: w.phone },
      create: {
        tenantId: tenant.id,
        email: w.email,
        firstName: w.firstName,
        lastName: w.lastName,
        city: w.city,
        phone: w.phone,
        workerNumber: w.workerNumber,
        role: 'TAKAHIM',
        teamId: team.id,
      },
    });
    workers.push(worker);
  }

  const today = withHour(new Date(), 8);
  const todayEvening = withHour(new Date(), 16);
  const todayNight = withHour(new Date(), 24);

  await prisma.shift.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.shift.createMany({
    data: [
      {
        tenantId: tenant.id,
        workerId: workers[0].id,
        teamId: team.id,
        date: startOfDay(today),
        startTime: today,
        endTime: todayEvening,
        status: 'SCHEDULED',
      },
      {
        tenantId: tenant.id,
        workerId: workers[1].id,
        teamId: team.id,
        date: startOfDay(today),
        startTime: todayEvening,
        endTime: todayNight,
        status: 'SCHEDULED',
        replacementId: workers[2].id,
      },
      {
        tenantId: tenant.id,
        workerId: workers[2].id,
        teamId: team.id,
        date: startOfDay(today),
        startTime: today,
        endTime: todayEvening,
        status: 'HOLIDAY',
      },
    ],
  });

  await prisma.incident.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.incident.create({
    data: {
      tenantId: tenant.id,
      workerId: workers[0].id,
      teamLeadId: teamLead.id,
      title: 'תקלה בבלמים',
      description: 'זוהתה תקלה בבלמים בקרון 3, יש לבדוק בהקדם',
      severity: 'high',
      route: 'MAINTENANCE',
      recipients: {
        create: [{ userId: teamLead.id }, { userId: maintenance.id }],
      },
    },
  });

  console.log('Seed complete.');
  console.log(`Admin login:       ${admin.email}`);
  console.log(`Team lead login:   ${teamLead.email}`);
  console.log(`Shibutz login:     ${shibutz.email}`);
  console.log(`Maintenance login: ${maintenance.email}`);
  console.log(`Worker logins:     ${workers.map((w) => w.email).join(', ')}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
