import { z } from 'zod';

export const createIncidentSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().min(2, 'Description is required'),
  severity: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  route: z.enum(['TEAM_LEAD', 'MAINTENANCE', 'EMERGENCY_BROADCAST']).default('TEAM_LEAD'),
});

export const updateIncidentStatusSchema = z.object({
  status: z.enum(['ACKNOWLEDGED', 'RESOLVED']),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type UpdateIncidentStatusInput = z.infer<typeof updateIncidentStatusSchema>;
