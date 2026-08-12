/**
 * Optional redirect of OTP *delivery* to a different mailbox.
 *
 * Only the delivery address changes. The OTP is still generated and verified
 * against the account's own email (`otp:{account email}` in Redis), so this
 * cannot be used to log in as an account you could not otherwise reach — it
 * only decides which inbox the code lands in.
 *
 * Configured via OTP_REDIRECT_MAP as a comma-separated list of
 * `account-email=delivery-email` pairs, e.g.
 *
 *   OTP_REDIRECT_MAP="admin@example.com=owner@example.com,worker@x.local=owner@example.com"
 *
 * Deliberately env-driven rather than hardcoded: it is visible in config,
 * auditable, changeable without a deploy, and absent by default so no other
 * environment inherits it. Every redirect is logged.
 */

let parsed: Map<string, string> | null = null;

function redirectMap(): Map<string, string> {
  if (parsed) return parsed;

  const map = new Map<string, string>();
  // Docker Compose `env_file` does not shell-parse values, so a quoted entry can
  // arrive with its quotes attached. Strip them rather than silently parsing
  // `"a@x.com` as an address and dropping the redirect.
  const raw = process.env.OTP_REDIRECT_MAP?.trim().replace(/^["']|["']$/g, '');

  if (raw) {
    for (const pair of raw.split(',')) {
      const [from, to] = pair.split('=').map((s) => s?.trim().toLowerCase());
      if (!from || !to || !from.includes('@') || !to.includes('@')) {
        console.warn(`[otp] ignoring malformed OTP_REDIRECT_MAP entry: "${pair.trim()}"`);
        continue;
      }
      map.set(from, to);
    }
  }

  parsed = map;
  return map;
}

/**
 * Mailbox the OTP for `accountEmail` should be delivered to.
 * Returns `accountEmail` unchanged when no redirect is configured.
 */
export function resolveOtpRecipient(accountEmail: string): string {
  const target = redirectMap().get(accountEmail.trim().toLowerCase());
  if (!target || target === accountEmail.trim().toLowerCase()) return accountEmail;

  console.warn(`[otp] delivering OTP for ${accountEmail} to ${target} (OTP_REDIRECT_MAP)`);
  return target;
}

/** Test seam — the map is parsed once and cached. */
export function resetOtpRoutingCache(): void {
  parsed = null;
}
