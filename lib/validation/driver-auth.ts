import { z } from 'zod';

const workerNumber = z.string().trim().min(1);
const phone = z.string().trim().regex(/^[0-9\-\+\s()]+$/);
const otp = z.string().length(6);

export const driverWorkerNumberSchema = z.object({ workerNumber });

export const driverRegisterSchema = z.object({
  workerNumber,
  email: z.string().trim().toLowerCase().email(),
  phone,
});

export const driverPhoneSchema = z.object({ phone });

/** A first login verifies against its worker number, a returning one against its phone. */
export const driverVerifySchema = z.union([
  z.object({ workerNumber, otp }),
  z.object({ phone, otp }),
]);
