import { z } from 'zod';

/** Roster dates are day-scoped; the sheet name is the only date the file carries. */
export const rosterDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const rosterQuerySchema = z.object({
  date: rosterDateSchema,
});

export const listSwapsQuerySchema = z.object({
  date: rosterDateSchema,
  kind: z.enum(['ABSORB_HANDOFF', 'SWAP_DUTIES', 'FILL_OPEN_DUTY']).optional(),
  status: z.enum(['NEW', 'DISMISSED', 'CONVERTED', 'SUPERSEDED']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const swapActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('DISMISS') }),
  z.object({
    action: z.literal('CONVERT'),
    side: z.enum(['A', 'B']),
    note: z.string().trim().min(2).max(500).optional(),
  }),
]);

export const setHomeStationSchema = z.object({
  stationId: z.string().min(1).nullable(),
});

export type ListSwapsQuery = z.infer<typeof listSwapsQuerySchema>;
export type SwapAction = z.infer<typeof swapActionSchema>;

/** Parse a YYYY-MM-DD roster date into the local midnight the importer stores. */
export function toRosterDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setHours(0, 0, 0, 0);
  return date;
}
