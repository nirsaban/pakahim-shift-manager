export interface Team {
  id: string;
  name: string;
  teamLeadId: string;
  teamLeadName: string;
  memberCount: number;
}

export interface Worker {
  id: string;
  name: string;
  workerNumber: string | null;
  role: string;
  teamId: string | null;
  teamName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  hasRegistered: boolean;
}

export const ROLES = ['TAKAHIM', 'TEAM_LEAD', 'SHIBUTZ', 'MAINTENANCE', 'ADMIN', 'SUPER_ADMIN'];
