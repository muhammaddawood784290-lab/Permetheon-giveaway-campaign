import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { authenticateAdminBearerToken } from "@/lib/admin/auth.server";
import { parseAdminAllowlist, isAdmin } from "@/lib/admin/authorization";

async function getAuthenticatedAdminIdentity() {
  const request = getRequest();
  if (!request?.headers) {
    throw new Error("Unauthorized");
  }
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = authHeader.slice("Bearer ".length);
  if (!token) {
    throw new Error("Unauthorized");
  }

  const { userId, email } = await authenticateAdminBearerToken(token);
  const allowlist = parseAdminAllowlist(process.env["ADMIN_ALLOWLIST"]);
  if (!isAdmin(userId, email, allowlist)) {
    throw new Error("Unauthorized");
  }

  return { userId, email };
}

export const adminSession = createServerFn({ method: "GET" })
  .validator(() => ({}))
  .handler(async () => {
    const identity = await getAuthenticatedAdminIdentity();
    return {
      authenticated: true,
      authorized: true,
      userId: identity.userId,
      email: identity.email,
    };
  });
