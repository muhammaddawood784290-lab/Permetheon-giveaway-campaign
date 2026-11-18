/**
 * Admin authorization for the Permetheon giveaway admin panel.
 *
 * Decisions:
 * - Authorization is checked server-side only.
 * - We do not trust editable user_metadata for authorization.
 * - The default gate is an allowlist of approved admin identities
 *   (email addresses and/or user IDs) supplied via the ADMIN_ALLOWLIST
 *   environment variable.
 * - Once the project has a reviewed admin model, this can be switched to
 *   app_metadata / a dedicated admin flag without changing the rest of the
 *   admin system.
 */

export type AdminIdentity = {
  userId: string;
  email: string | null;
};

/** Normalized identity used for matching against the allowlist. */
export type NormalizedIdentity = {
  userId: string;
  emailLower: string | null;
};

/**
 * Parse ADMIN_ALLOWLIST into a normalized set of allowed identities.
 *
 * Expected forms:
 *   - email addresses: admin@example.com
 *   - user IDs: a UUID-like identifier
 *
 * Empty / missing allowlist means no one is authorized.
 */
export function parseAdminAllowlist(raw?: string): ReadonlySet<NormalizedIdentity> {
  if (!raw) return new Set();
  const items = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return new Set(items.map(normalizeAdminEntry));
}

function normalizeAdminEntry(raw: string): NormalizedIdentity {
  const value = raw.trim();
  if (!value) return { userId: "", emailLower: null };
  if (/^[^ @]+@[^ @]+\.[^ @]+$/.test(value)) {
    return { userId: "", emailLower: value.toLowerCase() };
  }
  return { userId: value, emailLower: null };
}

/**
 * Build the normalized identity for an authenticated Supabase user.
 */
export function normalizedIdentityFromUser(
  userId: string,
  email: string | null,
): NormalizedIdentity {
  return {
    userId,
    emailLower: email ? email.toLowerCase() : null,
  };
}

/**
 * Decide whether the authenticated caller is an authorized admin.
 *
 * This does not use user_metadata. It uses an allowlist of approved emails/user
 * IDs (ADMIN_ALLOWLIST), and can later be switched to app_metadata once the
 * project configures a reviewed admin model.
 */
export function isAdmin(
  userId: string,
  email: string | null,
  allowlist: ReadonlySet<NormalizedIdentity>,
): boolean {
  if (!userId) return false;
  const identity = normalizedIdentityFromUser(userId, email);
  for (const allowed of allowlist) {
    if (allowed.userId && allowed.userId === identity.userId) return true;
    if (allowed.emailLower && identity.emailLower && allowed.emailLower === identity.emailLower) {
      return true;
    }
  }
  return false;
}

/**
 * Standardized unauthorized response for admin server code.
 */
export function unauthorizedResponseBody(): { error: string; code: string } {
  return {
    error: "Unauthorized",
    code: "ADMIN_UNAUTHORIZED",
  };
}
