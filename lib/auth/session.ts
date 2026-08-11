import { randomBytes } from 'crypto';
import { redis } from '../redis';

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface SessionData {
  userId: string;
  role: string;
}

function sessionKey(sessionId: string): string {
  return `sess:${sessionId}`;
}

export async function createSession(data: SessionData): Promise<string> {
  const sessionId = randomBytes(24).toString('hex');
  await redis.set(sessionKey(sessionId), JSON.stringify(data), 'EX', SESSION_TTL_SECONDS);
  return sessionId;
}

export async function isSessionLive(sessionId: string): Promise<boolean> {
  const exists = await redis.exists(sessionKey(sessionId));
  return exists === 1;
}

export async function destroySession(sessionId: string): Promise<void> {
  await redis.del(sessionKey(sessionId));
}
