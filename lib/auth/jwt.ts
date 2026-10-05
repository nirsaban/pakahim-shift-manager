import { SignJWT, jwtVerify } from 'jose';
import { parseWorkforce, type Workforce } from './workforce';

const secret = new TextEncoder().encode(process.env.JWT_SECRET as string);

export interface SessionJwtPayload {
  sessionId: string;
  userId: string;
  role: string;
  /** Absent on tokens issued before the drivers existed - those are פקחים. */
  workforce?: Workforce;
}

export interface VerifiedSessionJwt extends SessionJwtPayload {
  workforce: Workforce;
}

export async function signSessionJwt(payload: SessionJwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifySessionJwt(token: string): Promise<VerifiedSessionJwt | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (
      typeof payload.sessionId !== 'string' ||
      typeof payload.userId !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return null;
    }
    return {
      sessionId: payload.sessionId,
      userId: payload.userId,
      role: payload.role,
      workforce: parseWorkforce(payload.workforce),
    };
  } catch {
    return null;
  }
}
