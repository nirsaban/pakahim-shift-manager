import { randomInt } from 'crypto';
import { redis } from '../redis';

const OTP_TTL_SECONDS = 5 * 60;
const REQUEST_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

// Dev/demo convenience: "123456" always verifies when not in production, so
// login doesn't depend on actually receiving an email while testing locally.
const DEV_FALLBACK_OTP = '123456';
const DEV_FALLBACK_ENABLED = process.env.NODE_ENV !== 'production';

interface OtpRecord {
  code: string;
  attempts: number;
}

/**
 * What the code is issued against. For a returning worker this is their account
 * email; for a first-time registration the account has no email yet, so it is a
 * `reg:{tenantId}:{workerNumber}` subject instead (see pending-registration.ts).
 * Either way the caller decides - this module only needs it to be stable and
 * not attacker-chosen.
 */
function otpKey(subject: string): string {
  return `otp:${subject.toLowerCase()}`;
}

function cooldownKey(subject: string): string {
  return `otp:cooldown:${subject.toLowerCase()}`;
}

export type RequestOtpResult = { ok: true; code: string } | { ok: false; reason: 'cooldown' };

export async function requestOtp(subject: string): Promise<RequestOtpResult> {
  const onCooldown = await redis.exists(cooldownKey(subject));
  if (onCooldown) return { ok: false, reason: 'cooldown' };

  const code = String(randomInt(100000, 1000000));
  const record: OtpRecord = { code, attempts: 0 };
  await redis.set(otpKey(subject), JSON.stringify(record), 'EX', OTP_TTL_SECONDS);
  await redis.set(cooldownKey(subject), '1', 'EX', REQUEST_COOLDOWN_SECONDS);
  return { ok: true, code };
}

export async function verifyOtp(subject: string, code: string): Promise<boolean> {
  if (DEV_FALLBACK_ENABLED && code === DEV_FALLBACK_OTP) return true;

  const key = otpKey(subject);
  const raw = await redis.get(key);
  if (!raw) return false;

  const record = JSON.parse(raw) as OtpRecord;
  if (record.attempts >= MAX_ATTEMPTS) {
    await redis.del(key);
    return false;
  }

  if (record.code !== code) {
    record.attempts += 1;
    const ttl = await redis.ttl(key);
    await redis.set(key, JSON.stringify(record), 'EX', ttl > 0 ? ttl : OTP_TTL_SECONDS);
    return false;
  }

  await redis.del(key);
  return true;
}
