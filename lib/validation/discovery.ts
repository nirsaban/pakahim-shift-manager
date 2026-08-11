import { z } from 'zod';

export const saveDiscoveryAnswerSchema = z.object({
  questionId: z.string().min(1),
  section: z.string().min(1),
  question: z.string().min(1),
  answer: z.string(),
  method: z.enum(['typed', 'voice']).optional(),
});

export type SaveDiscoveryAnswerInput = z.infer<typeof saveDiscoveryAnswerSchema>;
