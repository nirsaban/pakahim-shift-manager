import { z } from 'zod';

export const workerNumberSchema = z.object({
  workerNumber: z.string().min(1, 'Worker number is required'),
});

export const registerSchema = z.object({
  workerNumber: z.string().min(1, 'Worker number is required'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  city: z.string().min(2, 'City is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().regex(/^[0-9\-\+\s()]+$/, 'Invalid phone number'),
});

export const workerNumberOtpSchema = z.object({
  workerNumber: z.string().min(1, 'Worker number is required'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export type WorkerNumberInput = z.infer<typeof workerNumberSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type WorkerNumberOtpInput = z.infer<typeof workerNumberOtpSchema>;
