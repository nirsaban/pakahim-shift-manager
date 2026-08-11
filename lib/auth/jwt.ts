import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET as string);

export interface SessionJwtPayload {
  sessionId: string;
  userId: string;
  role: string;
}

export async function signSessionJwt(payload: SessionJwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifySessionJwt(token: string): Promise<SessionJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (
      typeof payload.sessionId !== 'string' ||
      typeof payload.userId !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return null;
    }
    return { sessionId: payload.sessionId, userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}
