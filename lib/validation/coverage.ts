import { z } from 'zod';

export const requestCoverageSchema = z
  .object({
    shiftId: z.string().min(1),
    reason: z.enum(['SICK', 'HOLIDAY', 'SWAP', 'OTHER']),
    note: z.string().min(2).optional(),
    proposedReplacementId: z.string().min(1).optional(),
  })
  .refine((data) => data.reason !== 'OTHER' || !!data.note, {
    message: 'Note is required when reason is OTHER',
    path: ['note'],
  });

export const decideCoverageRequestSchema = z.discriminatedUnion('decision', [
  z.object({
    decision: z.literal('APPROVE'),
    replacementId: z.string().min(1).optional(),
    decisionNote: z.string().optional(),
  }),
  z.object({
    decision: z.literal('REJECT'),
    decisionNote: z.string().optional(),
  }),
]);

export const cancelCoverageRequestSchema = z.object({
  decision: z.literal('CANCEL'),
});

export const assignReplacementSchema = z.object({
  replacementId: z.string().min(1).nullable(),
});

export type RequestCoverageInput = z.infer<typeof requestCoverageSchema>;
export type DecideCoverageRequestInput = z.infer<typeof decideCoverageRequestSchema>;
export type AssignReplacementInput = z.infer<typeof assignReplacementSchema>;
