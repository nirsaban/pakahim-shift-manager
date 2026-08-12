import { prisma } from '../db/prisma';
import { he } from '../he';
import { sendIncidentAlertEmail } from '../mail/mailer';
import { notify } from './push-service';
import { formatWorkerName } from '../utils/display-name';
import type { CreateIncidentInput } from '../validation/incidents';

// q7 (client discovery): regular fault -> team lead only; train-equipment fault -> also
// מחלקת אחזקה; emergency -> "נוהל אירועים אחד" fanning out to every relevant party.
// Team lead is always included for situational awareness over their own team.
async function recipientIdsForRoute(
  tenantId: string,
  teamLeadId: string,
  route: CreateIncidentInput['route'],
): Promise<string[]> {
  const ids = new Set<string>([teamLeadId]);
  if (route === 'TEAM_LEAD') return Array.from(ids);

  if (route === 'MAINTENANCE') {
    const maintenance = await prisma.user.findMany({
      where: { tenantId, role: 'MAINTENANCE' },
      select: { id: true },
    });
    maintenance.forEach((u) => ids.add(u.id));
    return Array.from(ids);
  }

  // EMERGENCY_BROADCAST - every relevant party: all team leads, maintenance, and admins.
  const everyone = await prisma.user.findMany({
    where: { tenantId, role: { in: ['TEAM_LEAD', 'MAINTENANCE', 'ADMIN'] } },
    select: { id: true },
  });
  everyone.forEach((u) => ids.add(u.id));
  return Array.from(ids);
}

export async function createIncident(workerId: string, input: CreateIncidentInput) {
  const worker = await prisma.user.findUniqueOrThrow({
    where: { id: workerId },
    include: { team: true },
  });

  if (!worker.team) {
    throw new Error('Worker has no team assigned');
  }

  const teamLeadId = worker.team.teamLeadId;
  const recipientIds = await recipientIdsForRoute(worker.tenantId, teamLeadId, input.route);

  const incident = await prisma.incident.create({
    data: {
      tenantId: worker.tenantId,
      workerId: worker.id,
      teamLeadId,
      title: input.title,
      description: input.description,
      severity: input.severity,
      route: input.route,
      recipients: { create: recipientIds.map((userId) => ({ userId })) },
    },
  });

  const recipients = await prisma.user.findMany({ where: { id: { in: recipientIds } } });
  const workerName = formatWorkerName(worker);
  // Best-effort: incident is already persisted even if alert emails fail to send.
  await Promise.all(
    recipients
      .filter((r) => r.email)
      .map((r) =>
        sendIncidentAlertEmail(r.email as string, {
          title: incident.title,
          description: incident.description,
          severity: incident.severity,
          workerName,
        }).catch(() => {}),
      ),
  );

  // Push to the same fan-out the email goes to. An emergency stays on screen
  // until dismissed; a routine fault does not deserve that.
  const isEmergency = incident.route === 'EMERGENCY_BROADCAST';
  const copy = isEmergency ? he.push.incidentEmergency : he.push.incidentReported;
  notify(recipientIds, {
    title: copy.title,
    body: copy.body(workerName, incident.title),
    url: '/dashboard',
    tag: `incident-${incident.id}`,
    urgent: isEmergency,
  });

  const teamLead = recipients.find((r) => r.id === teamLeadId) ?? null;

  return {
    incident,
    teamLeadContact: teamLead ? { name: formatWorkerName(teamLead), phone: teamLead.phone } : null,
  };
}

export async function listIncidentsForUser(userId: string) {
  return prisma.incident.findMany({
    where: { recipients: { some: { userId } } },
    include: { worker: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateIncidentStatus(
  incidentId: string,
  userId: string,
  status: 'ACKNOWLEDGED' | 'RESOLVED',
) {
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: { recipients: true },
  });
  if (!incident || !incident.recipients.some((r) => r.userId === userId)) {
    return null;
  }

  return prisma.incident.update({
    where: { id: incidentId },
    data: {
      status,
      resolvedAt: status === 'RESOLVED' ? new Date() : incident.resolvedAt,
    },
  });
}
