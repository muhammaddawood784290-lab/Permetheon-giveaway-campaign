import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

/** Server-only boundary that inspects the incoming request's
 *  Authorization header. Handlers of this server function run exclusively on
 *  the server, so importing `@tanstack/react-start/server` here does not
 *  touch the client route graph / Vite import protection. */
export const adminEntryAuth = createServerFn({ method: "GET" })
  .validator(() => ({}))
  .handler(async () => {
    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");

    return {
      // Whether the request carries a "Bearer " Authorization header.
      hasAuth: !!authHeader && authHeader.startsWith("Bearer "),
      // Unauthenticated redirect target (used by the admin entries loader).
      redirectTo: "/admin/login",
      redirectSearch: { error: "unauthorized" },
    };
  });
