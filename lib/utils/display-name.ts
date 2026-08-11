interface NamedUser {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  workerNumber?: string | null;
}

export function formatWorkerName(user: NamedUser): string {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  if (fullName) return fullName;
  if (user.email) return user.email;
  if (user.workerNumber) return `עובד ${user.workerNumber}`;
  return 'עובד';
}
