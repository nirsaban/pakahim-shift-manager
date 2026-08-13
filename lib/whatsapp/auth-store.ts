// Value import, not `import type`: Prisma.DbNull is a runtime sentinel that
// clearing the creds column depends on (a plain null would mean "leave alone").
import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { WHATSAPP_SESSION_ID } from './constants';

/**
 * Postgres-backed persistence for the single Baileys session.
 *
 * Baileys' auth state is one opaque JSON blob (credentials + signal keys) once
 * run through BufferJSON, so it is stored as a single Json column rather than
 * modelled out. The row is upserted because the very first `creds.update` fires
 * before anything has created it.
 */
export class PrismaAuthStore {
  async load(): Promise<unknown | null> {
    const row = await prisma.whatsAppSession.findUnique({
      where: { id: WHATSAPP_SESSION_ID },
      select: { creds: true },
    });
    return row?.creds ?? null;
  }

  async save(creds: unknown): Promise<void> {
    const value = creds as Prisma.InputJsonValue;
    await prisma.whatsAppSession.upsert({
      where: { id: WHATSAPP_SESSION_ID },
      create: { id: WHATSAPP_SESSION_ID, creds: value },
      update: { creds: value },
    });
  }

  async clear(): Promise<void> {
    await prisma.whatsAppSession.updateMany({
      where: { id: WHATSAPP_SESSION_ID },
      data: { creds: Prisma.DbNull, phoneNumber: null },
    });
  }

  async setStatus(
    status: 'PENDING' | 'QR' | 'CONNECTED' | 'DISCONNECTED' | 'LOGGED_OUT',
    phoneNumber?: string,
  ): Promise<void> {
    await prisma.whatsAppSession.upsert({
      where: { id: WHATSAPP_SESSION_ID },
      create: { id: WHATSAPP_SESSION_ID, status, ...(phoneNumber ? { phoneNumber } : {}) },
      update: { status, ...(phoneNumber ? { phoneNumber } : {}) },
    });
  }

  async readStatus(): Promise<{ status: string; phoneNumber: string | null } | null> {
    return prisma.whatsAppSession.findUnique({
      where: { id: WHATSAPP_SESSION_ID },
      select: { status: true, phoneNumber: true },
    });
  }
}
