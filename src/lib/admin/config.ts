/**
 * Admin panel configuration shared by the admin routes and server functions.
 *
 * Only types and pure helpers live here so the module stays safe to import
 * from the browser bundle. Secrets and allowlists are read on the server in
 * `auth.server.ts`.
 */

import { parseAdminAllowlist, type NormalizedIdentity } from "./authorization";

/** HttpOnly cookie that carries the admin's Supabase access token. */
export const ADMIN_SESSION_COOKIE = "permetheon_admin_session";

/**
 * Session shape returned to the admin UI. `authorized` is the only field that
 * gates access; `email` and `name` are display only.
 */
export type AdminSession = {
  authenticated: boolean;
  authorized: boolean;
  email: string | null;
  name: string | null;
  authTime: number | null;
};

export const ANONYMOUS_ADMIN_SESSION: AdminSession = {
  authenticated: false,
  authorized: false,
  email: null,
  name: null,
  authTime: null,
};

/** Approved admin identities from `ADMIN_ALLOWLIST` (server-side only). */
export function adminAllowlist(
  raw: string | undefined = process.env["ADMIN_ALLOWLIST"],
): ReadonlySet<NormalizedIdentity> {
  return parseAdminAllowlist(raw);
}
