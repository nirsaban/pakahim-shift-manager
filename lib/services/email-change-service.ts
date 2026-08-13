import { prisma } from '../db/prisma';
import { requestOtp, verifyOtp } from '../auth/otp';
import { sendEmailChangeCode, sendEmailChangedNotice } from '../mail/mailer';

/**
 * Changing the email a login code is sent to.
 *
 * This is an account-takeover-shaped operation, not a profile edit: the email
 * is where `/api/auth/otp` sends the code that logs this worker in, so whoever
 * controls it controls the account. Three things follow, and all three are the
 * point of this module rather than incidental to it.
 *
 *   1. The code goes to the NEW address only. Receiving it is the proof that
 *      the person asking can read the inbox they are pointing the account at.
 *   2. The OTP subject binds the user AND the new address, so a code issued for
 *      one address cannot confirm a different one.
 *   3. The OLD address is told after the fact. If a stolen session did this,
 *      the real owner finds out somewhere the attacker cannot reach.
 */

export type RequestResult =
  | { ok: true }
  | { ok: false; error: 'email_taken' | 'same_email' | 'cooldown' | 'send_failed' };

export type ConfirmResult = { ok: true; email: string } | { ok: false; error: 'invalid_code' | 'email_taken' };

/**
 * Stable, and derived from the session rather than from anything the caller
 * supplies. Exported so the binding it encodes can be tested directly: the
 * whole security of this flow rests on a code issued for one address being
 * unusable against any other.
 */
export function emailChangeSubject(userId: string, email: string): string {
  return `email-change:${userId}:${email.toLowerCase()}`;
}

const subject = emailChangeSubject;

export async function requestEmailChange(userId: string, email: string): Promise<RequestResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tenantId: true, email: true },
  });
  if (!user) return { ok: false, error: 'email_taken' };

  if (user.email?.toLowerCase() === email) return { ok: false, error: 'same_email' };

  // Checked here for a clear message, and again on write - this read cannot
  // stop two people claiming the same address in the same moment, so the
  // unique index stays the actual guarantee.
  const taken = await prisma.user.findFirst({
    where: { tenantId: user.tenantId, email, NOT: { id: userId } },
    select: { id: true },
  });
  if (taken) return { ok: false, error: 'email_taken' };

  const otp = await requestOtp(subject(userId, email));
  if (!otp.ok) return { ok: false, error: 'cooldown' };

  // Sent directly rather than through deliverOtp: that helper prefers WhatsApp,
  // and a code delivered anywhere except the new mailbox would prove nothing
  // about who controls it.
  try {
    await sendEmailChangeCode(email, otp.code);
  } catch (error) {
    console.error('[email-change] could not send the code', error);
    return { ok: false, error: 'send_failed' };
  }

  return { ok: true };
}

export async function confirmEmailChange(
  userId: string,
  email: string,
  code: string,
): Promise<ConfirmResult> {
  const valid = await verifyOtp(subject(userId, email), code);
  if (!valid) return { ok: false, error: 'invalid_code' };

  const before = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });

  try {
    await prisma.user.update({ where: { id: userId }, data: { email } });
  } catch {
    // @@unique([tenantId, email]) - someone claimed it between the check and here.
    return { ok: false, error: 'email_taken' };
  }

  // Best-effort, and deliberately after the change: telling the previous owner
  // is worth doing even if it fails, and a mail failure must not undo a change
  // the worker has already proved they are entitled to make.
  if (before?.email && before.email.toLowerCase() !== email) {
    sendEmailChangedNotice(before.email, email).catch((error) =>
      console.error('[email-change] could not notify the previous address', error),
    );
  }

  return { ok: true, email };
}
