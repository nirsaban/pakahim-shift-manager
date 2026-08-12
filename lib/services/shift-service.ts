import { prisma } from '../db/prisma';
import { formatWorkerName } from '../utils/display-name';

export interface ReplacementInfo {
  name: string;
  city: string | null;
  phone: string | null;
}

export async function getNextShift(workerId: string) {
  // Include SICK/HOLIDAY too, not just SCHEDULED/STARTED: once a coverage request is
  // approved, the worker's own shift flips to SICK/HOLIDAY (they're not working it), but
  // they still need to see the confirmation that a replacement was actually assigned -
  // see docs/modules/coverage-engine.md. The UI distinguishes "your shift" from
  // "you're out, X covers" by shift.status.
  const shift = await prisma.shift.findFirst({
    where: {
      workerId,
      status: { in: ['SCHEDULED', 'STARTED', 'SICK', 'HOLIDAY'] },
      endTime: { gte: new Date() },
    },
    orderBy: { startTime: 'asc' },
    include: { replacement: true },
  });
  if (!shift) return null;

  const replacement: ReplacementInfo | null = shift.replacement
    ? { name: formatWorkerName(shift.replacement), city: shift.replacement.city, phone: shift.replacement.phone }
    : null;

  return { shift, replacement };
}
