/**
 * Admin auth helpers.
 *
 * Admin authentication is handled by Supabase Auth. The admin server functions
 * validate the caller's bearer token themselves by calling Supabase auth with
 * the token, then check admin authorization in `src/lib/admin/authorization.ts`.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { parseAdminAllowlist, isAdmin } from "@/lib/admin/authorization";

function supabaseAuthClientFor(token: string) {
  const url = process.env["SUPABASE_URL"] ?? "";
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }
  return createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Validate the caller's bearer token and return the authenticated identity,
 * or throw if the token is missing/invalid.
 */
export async function authenticateAdminBearerToken(
  token: string,
): Promise<{ userId: string; email: string | null }> {
  const sb = supabaseAuthClientFor(token);
  const { data, error } = await sb.auth.getClaims(token);
  if (error || !data?.claims) {
    throw new Error("Unauthorized");
  }
  if (!data.claims.sub) {
    throw new Error("Unauthorized");
  }
  return {
    userId: data.claims.sub,
    email: data.claims.email ?? null,
  };
}

/**
 * Build the URL that the admin UI should send the user to in order to sign in.
 */
export function buildAdminLoginUrl(redirectTo?: string): string {
  const baseUrl = process.env["SUPABASE_URL"];
  if (!baseUrl) {
    throw new Error("Missing SUPABASE_URL; admin login is not configured");
  }

  const redirect = redirectTo ?? "/admin/entries";
  const url = new URL(`${baseUrl}/auth/v1/authorize`);
  url.searchParams.set("provider", "email");
  url.searchParams.set("redirect_to", redirect);

  return url.toString();
}
