import type { AuthenticationCreds, SignalDataTypeMap, SignalKeyStore, WASocket } from 'baileys';
import { PrismaAuthStore } from './auth-store';
import { STATUS_TO_DB, type WhatsAppConnectionStatus } from './constants';
import { normalizeIsraeliPhone, toWhatsAppJid } from './phone';

/**
 * The app's single outbound WhatsApp connection, used to deliver OTPs.
 *
 * Runs in-process inside the Next.js server rather than as a separate gateway
 * container: pakahim is a one-container app, and standing up a second image,
 * CI job and compose service to send one kind of message would cost far more
 * than it buys. The trade-off is that the socket dies with every deploy - which
 * is survivable precisely because the auth blob is persisted, so it re-pairs
 * itself from stored credentials instead of asking an admin to re-scan.
 *
 * Send-only by design. Baileys can receive, but nothing here needs inbound
 * messages, and not registering a handler keeps workers' replies out of the
 * app entirely.
 */

/** Shape persisted through BufferJSON: creds plus a flat `${type}-${id}` map. */
interface AuthBlob {
  creds: AuthenticationCreds;
  keys: Record<string, unknown>;
}

const RECONNECT_DELAY_MS = 3000;
/** Baileys stops emitting a usable QR after a while; a stale one just fails to scan. */
const QR_TTL_MS = 60_000;

export interface WhatsAppState {
  status: WhatsAppConnectionStatus;
  /** Raw QR payload, present only while status is "qr". */
  qr: string | null;
  phoneNumber: string | null;
}

class WhatsAppService {
  private readonly authStore = new PrismaAuthStore();
  private sock: WASocket | null = null;
  private status: WhatsAppConnectionStatus = 'pending';
  private qr: string | null = null;
  private qrAt = 0;
  private phoneNumber: string | null = null;
  private starting: Promise<void> | null = null;
  private reconnecting = false;
  /** Set by logout() so the close handler does not immediately redial. */
  private intentionallyClosed = false;

  /** Live state for the admin pairing screen. */
  async state(): Promise<WhatsAppState> {
    // Before the socket has ever been started in this process the only truth is
    // what the last process persisted - otherwise a restart would report
    // "pending" to an admin whose number is in fact still paired.
    if (!this.sock && this.status === 'pending') {
      const row = await this.authStore.readStatus().catch(() => null);
      if (row) {
        // A session persisted by a previous process (typically the one this
        // deploy replaced). Bring the socket back up so the status converges on
        // reality within a poll or two instead of reporting "connected" for a
        // socket this process does not actually hold.
        if (row.status !== 'LOGGED_OUT') void this.ensureResumed();
        return {
          status: row.status.toLowerCase() as WhatsAppConnectionStatus,
          qr: null,
          phoneNumber: row.phoneNumber,
        };
      }
    }
    return {
      status: this.status,
      qr: this.qr && Date.now() - this.qrAt < QR_TTL_MS ? this.qr : null,
      phoneNumber: this.phoneNumber,
    };
  }

  /** True when a message can actually be sent right now. */
  isConnected(): boolean {
    return this.status === 'connected' && this.sock !== null;
  }

  /** Start pairing (or resume a stored session). Safe to call repeatedly. */
  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'qr') return;
    if (this.starting) return this.starting;
    this.intentionallyClosed = false;
    this.starting = this.startSocket().finally(() => {
      this.starting = null;
    });
    return this.starting;
  }

  /**
   * Bring the socket up if credentials were already stored, without starting a
   * fresh pairing. Called before sending so the connection re-establishes
   * itself after a deploy with no admin involvement - but a never-paired app
   * stays quiet rather than generating a QR nobody is watching.
   */
  private async ensureResumed(): Promise<void> {
    if (this.sock || this.starting) return;
    const stored = await this.authStore.load().catch(() => null);
    if (!stored) return;
    await this.connect().catch((err) => {
      console.error('[whatsapp] resume failed:', err);
    });
  }

  async logout(): Promise<void> {
    this.intentionallyClosed = true;
    if (this.sock) {
      try {
        await this.sock.logout();
      } catch {
        /* the socket may already be dead; clearing local state is what matters */
      }
      this.sock = null;
    }
    this.qr = null;
    this.phoneNumber = null;
    await this.authStore.clear();
    await this.setStatus('logged_out');
  }

  /**
   * Deliver a message. Returns false rather than throwing when WhatsApp simply
   * is not available, so OTP delivery can fall back to email; a thrown error
   * here would turn "WhatsApp is unpaired" into a failed login.
   */
  async send(phone: string, text: string): Promise<boolean> {
    const normalized = normalizeIsraeliPhone(phone);
    if (!normalized) return false;

    await this.ensureResumed();
    if (!this.isConnected() || !this.sock) return false;

    try {
      await this.sock.sendMessage(toWhatsAppJid(normalized), { text });
      return true;
    } catch (err) {
      console.error('[whatsapp] send failed:', err);
      return false;
    }
  }

  // ---------- internals ----------

  private async startSocket(): Promise<void> {
    // Imported lazily so that Baileys - a large, pure-ESM dependency - is only
    // loaded in the request path that actually needs WhatsApp, and a failure to
    // load degrades OTP delivery to email instead of breaking the whole server.
    const {
      DisconnectReason,
      fetchLatestBaileysVersion,
      makeCacheableSignalKeyStore,
      makeWASocket,
    } = await import('baileys');
    const pino = (await import('pino')).default;
    const logger = pino({ level: process.env.BAILEYS_LOG_LEVEL ?? 'silent' });

    const { creds, keys, persist } = await this.loadAuth();
    const { version } = await fetchLatestBaileysVersion().catch(() => ({
      version: undefined as [number, number, number] | undefined,
    }));

    const sock = makeWASocket({
      auth: { creds, keys: makeCacheableSignalKeyStore(keys, logger) },
      logger,
      ...(version ? { version } : {}),
      browser: ['Pakahim', 'Chrome', '1.0.0'],
      markOnlineOnConnect: false,
    });
    this.sock = sock;

    // Persist immediately so the device identity survives a restart that
    // happens mid-pairing, before the first creds.update would have fired.
    void persist();
    sock.ev.on('creds.update', () => void persist());

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qr = qr;
        this.qrAt = Date.now();
        void this.setStatus('qr');
      }

      if (connection === 'open') {
        this.qr = null;
        this.phoneNumber = sock.user?.id?.split(':')[0] ?? null;
        void this.setStatus('connected', this.phoneNumber ?? undefined);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output
          ?.statusCode;

        if (statusCode === DisconnectReason.loggedOut) {
          // The number was unlinked from the phone - stored creds are now
          // worthless and reconnecting would loop forever on a 401.
          this.sock = null;
          this.qr = null;
          void this.authStore.clear();
          void this.setStatus('logged_out');
          return;
        }
        if (this.intentionallyClosed) return;
        this.scheduleReconnect();
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnecting) return;
    this.reconnecting = true;
    this.sock = null;
    void this.setStatus('disconnected');
    setTimeout(() => {
      this.reconnecting = false;
      if (this.intentionallyClosed) return;
      void this.startSocket().catch((err) => {
        // Nothing to escalate to - the next send (or an admin opening the
        // pairing page) retries.
        console.error('[whatsapp] reconnect failed:', err);
      });
    }, RECONNECT_DELAY_MS);
  }

  private async setStatus(
    status: WhatsAppConnectionStatus,
    phoneNumber?: string,
  ): Promise<void> {
    this.status = status;
    await this.authStore.setStatus(STATUS_TO_DB[status], phoneNumber).catch((err) => {
      console.error('[whatsapp] status persist failed:', err);
    });
  }

  /** Baileys creds plus a key store backed by the persisted blob. */
  private async loadAuth(): Promise<{
    creds: AuthenticationCreds;
    keys: SignalKeyStore;
    persist: () => Promise<void>;
  }> {
    const { BufferJSON, initAuthCreds, proto } = await import('baileys');

    const raw = await this.authStore.load();
    const blob: AuthBlob = raw
      ? (JSON.parse(JSON.stringify(raw), BufferJSON.reviver) as AuthBlob)
      : { creds: initAuthCreds(), keys: {} };

    const creds = blob.creds;
    const keyMap = blob.keys ?? {};

    const persist = async () => {
      const serializable = JSON.parse(JSON.stringify({ creds, keys: keyMap }, BufferJSON.replacer));
      await this.authStore.save(serializable);
    };

    const keys: SignalKeyStore = {
      get: async (type, ids) => {
        const out: Record<string, unknown> = {};
        for (const id of ids) {
          let value = keyMap[`${type}-${id}`];
          // App-state sync keys are protobuf messages; Baileys hands them back
          // expecting the decoded type, not the plain object JSON gave us.
          if (type === 'app-state-sync-key' && value) {
            value = proto.Message.AppStateSyncKeyData.fromObject(value);
          }
          out[id] = value;
        }
        return out as { [id: string]: SignalDataTypeMap[typeof type] };
      },
      set: async (data) => {
        for (const category in data) {
          const cat = data[category as keyof typeof data];
          for (const id in cat) {
            const value = cat[id];
            const key = `${category}-${id}`;
            if (value) keyMap[key] = value;
            else delete keyMap[key];
          }
        }
        await persist();
      },
    };

    return { creds, keys, persist };
  }
}

// One socket per process, kept on globalThis so Next's dev-mode module reloads
// do not strand a live connection (same reason lib/redis.ts and lib/db/prisma.ts
// do this). WhatsApp allows a limited number of linked devices, and each
// abandoned socket burns one.
const globalForWhatsApp = globalThis as unknown as { whatsapp?: WhatsAppService };

export const whatsapp = globalForWhatsApp.whatsapp ?? new WhatsAppService();

if (process.env.NODE_ENV !== 'production') {
  globalForWhatsApp.whatsapp = whatsapp;
}
