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
