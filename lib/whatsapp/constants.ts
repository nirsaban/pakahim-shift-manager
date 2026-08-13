/**
 * The app sends OTPs from exactly one WhatsApp number, so the session table
 * holds a single row under this fixed id. Kept in its own module so the Prisma
 * store and the provider agree on it without importing each other.
 */
export const WHATSAPP_SESSION_ID = 'default';

export type WhatsAppConnectionStatus =
  | 'pending'
  | 'qr'
  | 'connected'
  | 'disconnected'
  | 'logged_out';

export const STATUS_TO_DB: Record<
  WhatsAppConnectionStatus,
  'PENDING' | 'QR' | 'CONNECTED' | 'DISCONNECTED' | 'LOGGED_OUT'
> = {
  pending: 'PENDING',
  qr: 'QR',
  connected: 'CONNECTED',
  disconnected: 'DISCONNECTED',
  logged_out: 'LOGGED_OUT',
};
