import { createServerFn } from "@tanstack/react-start";
import type { StartSessionResult } from "@/lib/admin/auth.server";

export type { StartSessionResult };

/**
 * The browser signs in with `supabase.auth.signInWithPassword`, then hands the
 * resulting access token here. The server validates it with Supabase and checks
 * ADMIN_ALLOWLIST before authorizing the admin panel.
 */
export const adminStartSession = createServerFn({ method: "POST" })
  .validator((input: { accessToken: string }) => input)
  .handler(async ({ data }): Promise<StartSessionResult> => {
    const { startAdminSession } = await import("@/lib/admin/auth.server");
    return startAdminSession(data.accessToken);
  });

/**
 * Deletes the admin cookie. `accessToken` restricts the delete to a cookie that
 * still holds that token (late cleanup after sign-out).
 */
export const adminSignOut = createServerFn({ method: "POST" })
  .validator((input: { accessToken?: string }) => input)
  .handler(async ({ data }) => {
    const { signOutAdmin } = await import("@/lib/admin/auth.server");
    signOutAdmin(data.accessToken);
    return { ok: true as const };
  });
