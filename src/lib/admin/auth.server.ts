/**
 * Admin authentication.
 *
 * Admins sign in with a Supabase Auth email/password account. The verified
 * access token is stored in an HttpOnly cookie so server functions can
 * authenticate every admin request without the browser handling the token.
 *
 * Authorization is a separate step: the identity must also appear in
 * `ADMIN_ALLOWLIST` (see `authorization.ts`).
 */

import { createClient } from "@supabase/supabase-js";
import { deleteCookie, getCookie, getRequest, setCookie } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";
import { isAdmin } from "@/lib/admin/authorization";
import {
  ADMIN_SESSION_COOKIE,
  adminAllowlist,
  ANONYMOUS_ADMIN_SESSION,
  type AdminSession,
} from "@/lib/admin/config";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

type VerifiedIdentity = {
  userId: string;
  email: string | null;
  name: string | null;
  authTime: number | null;
};

function supabaseAuthConfig(): { url: string; key: string } {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY; admin sign-in is not configured.",
    );
  }

  return { url, key };
}

function authClient(): ReturnType<typeof createClient<Database>> {
  const { url, key } = supabaseAuthConfig();
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Read the session token from the admin cookie, falling back to a bearer header. */
function sessionToken(): string | undefined {
  const cookie = getCookie(ADMIN_SESSION_COOKIE);
  if (cookie) return cookie;

  const header = getRequest().headers.get("authorization");
  if (header && header.toLowerCase().startsWith("bearer ")) {
    return header.slice("bearer ".length).trim() || undefined;
  }

  return undefined;
}

/** Validate a Supabase access token and return its owner, or `null`. */
async function verifySessionToken(token: string): Promise<VerifiedIdentity | null> {
  try {
    const { data, error } = await authClient().auth.getClaims(token);
    const claims = data?.claims;
    if (error || !claims?.sub) return null;

    const metadata = (claims as { user_metadata?: Record<string, unknown> }).user_metadata;
    const name =
      typeof metadata?.["full_name"] === "string"
        ? metadata["full_name"]
        : typeof metadata?.["name"] === "string"
          ? metadata["name"]
          : null;

    return {
      userId: claims.sub,
      email: typeof claims.email === "string" ? claims.email : null,
      name,
      authTime: typeof claims.iat === "number" ? claims.iat : null,
    };
  } catch {
    return null;
  }
}

function buildSession(identity: VerifiedIdentity): AdminSession {
  return {
    authenticated: true,
    authorized: isAdmin(identity.userId, identity.email, adminAllowlist()),
    email: identity.email,
    name: identity.name,
    authTime: identity.authTime,
  };
}

/** Resolve the current admin session from the request. Never throws. */
export async function readAdminSession(): Promise<AdminSession> {
  const token = sessionToken();
  if (!token) return ANONYMOUS_ADMIN_SESSION;

  const identity = await verifySessionToken(token);
  if (!identity) return ANONYMOUS_ADMIN_SESSION;

  return buildSession(identity);
}

/** Resolve the current session or throw, for server code that requires an admin. */
export async function requireAdminSession(): Promise<AdminSession> {
  const session = await readAdminSession();
  if (!session.authenticated) throw new Error("Unauthorized");
  if (!session.authorized) throw new Error("Forbidden");
  return session;
}

export type StartSessionFailure = {
  ok: false;
  /** Machine-readable cause, so callers never have to match on `error` copy. */
  reason: "unconfigured" | "expired" | "unauthorized";
  error: string;
};

export type StartSessionResult = { ok: true; session: AdminSession } | StartSessionFailure;

/**
 * Called after the browser has already signed in with Supabase Auth.
 *
 * The password never reaches this server; it only receives the access token the
 * browser client produced, validates it with Supabase, checks ADMIN_ALLOWLIST,
 * and mirrors it into an HttpOnly cookie so server-rendered admin routes can
 * authorize the same session.
 */
export async function startAdminSession(accessToken: string): Promise<StartSessionResult> {
  if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_PUBLISHABLE_KEY"]) {
    return {
      ok: false,
      reason: "unconfigured",
      error:
        "Admin sign-in is not configured on the server: SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set.",
    };
  }

  const identity = accessToken ? await verifySessionToken(accessToken) : null;
  if (!identity) {
    return {
      ok: false,
      reason: "expired",
      error: "Your session has expired. Please sign in again.",
    };
  }

  const session = buildSession(identity);
  if (!session.authorized) {
    return { ok: false, reason: "unauthorized", error: "That account is not an authorized admin." };
  }

  setCookie(ADMIN_SESSION_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return { ok: true, session };
}

/**
 * Authenticate a raw bearer token and return its owner identity.
 *
 * This is the server-only entry point used by `adminSession` and other
 * admin server code that already extracted a Bearer token from the request
 * and wants Supabase to confirm the caller before it checks ADMIN_ALLOWLIST.
 *
 * Returns `null` when the token is missing, expired, or malformed.
 */
export async function authenticateAdminBearerToken(
  token: string,
): Promise<{ userId: string; email: string | null } | null> {
  const identity = await verifySessionToken(token);
  if (!identity) return null;

  return { userId: identity.userId, email: identity.email };
}

/**
 * Delete the admin cookie. When `token` is given the cookie is only removed if it
 * still holds that token, so a late cleanup for an ended session cannot delete
 * the cookie of a newer one.
 */
export function signOutAdmin(token?: string): void {
  if (token && getCookie(ADMIN_SESSION_COOKIE) !== token) return;
  deleteCookie(ADMIN_SESSION_COOKIE, { path: "/" });
}
