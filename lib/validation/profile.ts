import { z } from 'zod';
import { normalizeIsraeliPhone } from '../whatsapp/phone';
import { LEAD_MINUTE_OPTIONS, REMINDER_SOUNDS } from '../notifications/reminder-rules';

/**
 * What a worker may change about themselves.
 *
 * Deliberately narrow: name, phone and city are self-reported and the roster
 * importer is already written never to overwrite them. Everything the roster
 * owns - worker number, team, role - is absent, because a worker editing their
 * own team would silently diverge from the file the scheduling department sends.
 */
export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().max(60).nullable().optional(),
  city: z.string().trim().max(60).nullable().optional(),
  /**
   * Validated by the same parser that addresses WhatsApp, so a number that
   * saves is a number an OTP can actually reach. Stored as typed - the app
   * displays it back to the worker, and `toWhatsAppLink` normalizes at use.
   */
  phone: z
    .string()
    .trim()
    .max(30)
    .nullable()
    .optional()
    .refine((v) => !v || normalizeIsraeliPhone(v) !== null, 'invalid_phone'),
});

export const updateReminderSettingsSchema = z.object({
  enabled: z.boolean(),
  // A free-text number would let a client ask for a 3-minute lead the scheduler
  // ticks past, or a 30-day one that scans the whole shifts table.
  leadMinutes: z.union(
    LEAD_MINUTE_OPTIONS.map((m) => z.literal(m)) as unknown as [z.ZodLiteral<number>, z.ZodLiteral<number>],
  ),
  sound: z.enum(REMINDER_SOUNDS as [string, ...string[]]),
});

/**
 * Changing the address a login code is sent to.
 *
 * Split into two steps on purpose. Asking for the change only sends a code to
 * the *new* address; nothing about the account moves until that code comes
 * back, which is what proves the person asking can actually read the inbox they
 * are pointing the account at. A single-step "just save it" would let anyone
 * holding a live session redirect every future login code to themselves.
 */
export const requestEmailChangeSchema = z.object({
  email: z.string().trim().toLowerCase().email('invalid_email').max(200),
});

export const confirmEmailChangeSchema = z.object({
  email: z.string().trim().toLowerCase().email('invalid_email').max(200),
  code: z.string().trim().regex(/^\d{6}$/, 'invalid_code'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type RequestEmailChangeInput = z.infer<typeof requestEmailChangeSchema>;
export type ConfirmEmailChangeInput = z.infer<typeof confirmEmailChangeSchema>;
export type UpdateReminderSettingsInput = z.infer<typeof updateReminderSettingsSchema>;
