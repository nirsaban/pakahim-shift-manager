import { prisma } from '../db/prisma';
import { formatWorkerName } from '../utils/display-name';

export interface ReplacementInfo {
  name: string;
  city: string | null;
  phone: string | null;
}

export async function getNextShift(workerId: string) {
  const shift = await prisma.shift.findFirst({
    where: {
      workerId,
      status: { in: ['SCHEDULED', 'STARTED'] },
      endTime: { gte: new Date() },
    },
    orderBy: { startTime: 'asc' },
  });
  if (!shift) return null;

  let replacement: ReplacementInfo | null = null;
  if (shift.replacementId) {
    const user = await prisma.user.findUnique({ where: { id: shift.replacementId } });
    replacement = user ? { name: formatWorkerName(user), city: user.city, phone: user.phone } : null;
  }

  return { shift, replacement };
}
