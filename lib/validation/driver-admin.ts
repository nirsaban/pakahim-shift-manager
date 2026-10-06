import { z } from 'zod';
import { normalizeIsraeliPhone } from '../whatsapp/phone';

// Empty means "none": the form sends every field, cleared ones as "".
const optional = z
  .string()
  .trim()
  .transform((v) => v || null)
  .nullable()
  .optional();

/** A driver's phone is their login, so it must be a mobile WhatsApp can reach. */
const phone = optional.refine((v) => v == null || normalizeIsraeliPhone(v) !== null, { message: 'invalid_phone' });
const workerNumber = optional.refine((v) => v == null || /^\d{3,9}$/.test(v), { message: 'invalid_worker_number' });

export const driverFieldsSchema = z.object({
  firstName: z.string().trim().min(2),
  workerNumber,
  phone,
  city: optional,
});

export type DriverFieldsInput = z.infer<typeof driverFieldsSchema>;
