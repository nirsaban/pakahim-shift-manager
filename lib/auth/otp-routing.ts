/**
 * Optional redirect of OTP *delivery* to one or more different mailboxes.
 *
 * Only the delivery address changes. The OTP is still generated and verified
 * against the account's own email (`otp:{account email}` in Redis), so this
 * cannot be used to log in as an account you could not otherwise reach — it
 * only decides which inbox(es) the code lands in.
 *
 * Configured via OTP_REDIRECT_MAP as a comma-separated list of
 * `account-email=delivery-email` pairs. Several destinations for one account
 * are separated by a semicolon, so a single code can reach two people:
 *
 *   OTP_REDIRECT_MAP="shared@x.local=owner@example.com;deputy@example.com"
 *
 * Deliberately env-driven rather than hardcoded: it is visible in config,
 * auditable, changeable without a deploy, and absent by default so no other
 * environment inherits it. Every redirect is logged.
 */

let parsed: Map<string, string[]> | null = null;

function redirectMap(): Map<string, string[]> {
  if (parsed) return parsed;

  const map = new Map<string, string[]>();
  // Docker Compose `env_file` does not shell-parse values, so a quoted entry can
  // arrive with its quotes attached. Strip them rather than silently parsing
  // `"a@x.com` as an address and dropping the redirect.
  const raw = process.env.OTP_REDIRECT_MAP?.trim().replace(/^["']|["']$/g, '');

  if (raw) {
    for (const pair of raw.split(',')) {
      const [from, rest] = pair.split('=').map((s) => s?.trim().toLowerCase());
      if (!from || !rest || !from.includes('@')) {
        console.warn(`[otp] ignoring malformed OTP_REDIRECT_MAP entry: "${pair.trim()}"`);
        continue;
      }
      const targets = rest
        .split(';')
        .map((t) => t.trim())
        .filter((t) => t.includes('@'));
      if (targets.length === 0) {
        console.warn(`[otp] ignoring OTP_REDIRECT_MAP entry with no valid target: "${pair.trim()}"`);
        continue;
      }
      map.set(from, targets);
    }
  }

  parsed = map;
  return map;
}

/**
 * Mailboxes the OTP for `accountEmail` should be delivered to.
 * Returns `[accountEmail]` unchanged when no redirect is configured.
 */
export function resolveOtpRecipients(accountEmail: string): string[] {
  const normalized = accountEmail.trim().toLowerCase();
  const targets = redirectMap().get(normalized);
  if (!targets || targets.length === 0) return [accountEmail];

  // A self-mapping with no extra destinations is not a redirect.
  if (targets.length === 1 && targets[0] === normalized) return [accountEmail];

  console.warn(`[otp] delivering OTP for ${accountEmail} to ${targets.join(', ')} (OTP_REDIRECT_MAP)`);
  return targets;
}

/** Test seam — the map is parsed once and cached. */
export function resetOtpRoutingCache(): void {
  parsed = null;
}
