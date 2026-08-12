import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().min(2),
  teamLeadId: z.string().min(1),
});

export const updateTeamSchema = z.object({
  name: z.string().min(2).optional(),
  teamLeadId: z.string().min(1).optional(),
});

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'SHIBUTZ', 'TEAM_LEAD', 'TAKAHIM', 'MAINTENANCE'] as const;

export const createWorkerSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2).optional(),
  workerNumber: z.string().min(1),
  role: z.enum(ROLES).default('TAKAHIM'),
  teamId: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
});

export const updateWorkerSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().optional(),
  role: z.enum(ROLES).optional(),
  teamId: z.string().min(1).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type CreateWorkerInput = z.infer<typeof createWorkerSchema>;
export type UpdateWorkerInput = z.infer<typeof updateWorkerSchema>;
