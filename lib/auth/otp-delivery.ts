import { sendOtpEmail } from '../mail/mailer';
import { he } from '../he';
import { whatsapp } from '../whatsapp/service';
import { resolveOtpRecipients } from './otp-routing';

/**
 * Gets a login/registration code to the worker over whichever channel is
 * actually available.
 *
 * WhatsApp is tried first because it is what the client asked for and what
 * workers actually read; email is the fallback that has always worked. Delivery
 * is best-effort by design - the code is already stored in Redis by the time we
 * get here, and a flaky mail host or an unpaired WhatsApp number must not turn
 * into a failed login. The caller only learns which channels succeeded so the
 * UI can say "check WhatsApp" rather than "check your email".
 */

export type OtpChannel = 'whatsapp' | 'email';

interface DeliverOtpInput {
  code: string;
  /** Account email; may be absent for a registration keyed only by phone. */
  email?: string | null;
  phone?: string | null;
}

function whatsappMessage(code: string): string {
  return `${he.brand.name}\n\nקוד האימות שלך הוא: ${code}\nהקוד תקף ל-5 דקות.\n\nאם לא ביקשת קוד, התעלם מהודעה זו.`;
}

export async function deliverOtp(input: DeliverOtpInput): Promise<OtpChannel[]> {
  const delivered: OtpChannel[] = [];

  if (input.phone) {
    const sent = await whatsapp
      .send(input.phone, whatsappMessage(input.code))
      .catch((err) => {
        console.error('[otp] whatsapp delivery failed:', err);
        return false;
      });
    if (sent) delivered.push('whatsapp');
  }

  // Only fall back to email when WhatsApp did not get there, so a worker with
  // both does not receive the same code twice. Delivery may be redirected via
  // OTP_REDIRECT_MAP; the code is still issued and verified against the
  // account's own identity, so that only changes which inbox it lands in.
  if (delivered.length === 0 && input.email) {
    const sent = await sendOtpEmail(resolveOtpRecipients(input.email), input.code)
      .then(() => true)
      .catch((err) => {
        console.error('[otp] email delivery failed:', err);
        return false;
      });
    if (sent) delivered.push('email');
  }

  if (delivered.length === 0) {
    console.error('[otp] no channel could deliver the code');
  }
  return delivered;
}
