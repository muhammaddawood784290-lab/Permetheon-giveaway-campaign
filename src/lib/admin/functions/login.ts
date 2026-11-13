import { createServerFn } from "@tanstack/react-start";
import { buildAdminLoginUrl } from "@/lib/admin/auth.server";

export const adminLoginUrl = createServerFn({ method: "GET" })
  .validator(() => ({}))
  .handler(async () => {
    return { url: buildAdminLoginUrl("/admin/entries") };
  });
