import { z } from 'zod';

// Shape of one shift after the raw multi-block roster Excel file has been
// parsed and normalized (see lib/services/upload-service.ts) - not the raw
// spreadsheet columns, which vary in type row to row.
export const importedShiftRowSchema = z.object({
  region: z.string().min(1),
  workerNumber: z.string().min(1),
  name: z.string().min(1),
  startMinutes: z.number().int().min(0).max(1439),
  endMinutes: z.number().int().min(0).max(1439),
  notes: z.string(),
});

export type ImportedShiftRow = z.infer<typeof importedShiftRowSchema>;

/**
 * Window for "my shifts". Bounded on both sides so a client cannot ask the
 * dashboard to scan the whole shifts table; the defaults cover a fortnight
 * either way, which is more than any one uploaded workbook carries.
 */
export const myShiftsQuerySchema = z.object({
  daysBack: z.coerce.number().int().min(0).max(90).default(0),
  daysForward: z.coerce.number().int().min(1).max(90).default(21),
});

export type MyShiftsQuery = z.infer<typeof myShiftsQuerySchema>;
