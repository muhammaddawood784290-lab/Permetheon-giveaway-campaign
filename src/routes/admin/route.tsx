import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { adminSession } from "@/lib/admin/functions/session";
import { adminEntryAuth } from "@/lib/admin/functions/entries-auth";

const getAdminSession = createServerFn({ method: "GET" })
  .validator(() => ({}))
  .handler(async () => {
    return adminSession();
  });

export const Route = createFileRoute("/admin")({
  loader: async ({ location }) => {
    const path = location?.pathname ?? "";

    // Only protect the admin entries area (/admin/entries and /admin/entries/$id).
    // /admin/login stays publicly reachable; no session check runs on login.
    if (path.startsWith("/admin/entries")) {
      const auth = await adminEntryAuth();

      // If the request does not carry a Bearer token, redirect to login.
      if (!auth.hasAuth) {
        throw redirect({
          to: auth.redirectTo,
          search: auth.redirectSearch,
        });
      }

      // Only call getAdminSession() when a Bearer header exists.
      const session = await getAdminSession();

      if (!session?.authenticated || !session?.authorized) {
        throw redirect({ to: "/admin/login", search: { error: "unauthorized" } });
      }
      return session;
    }

    // Public admin pages (for example /admin/login) use their own standalone
    // layout and must not render the protected Entries shell/header.
    return null;
  },
  component: AdminLayoutMaybe,
});

function AdminLayoutMaybe() {
  const session = Route.useLoaderData();

  // Public admin pages (for example /admin/login) use their own standalone layout
  // and must not render the protected Entries shell/header.
  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-muted/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-[0.18em] text-foreground">
              PERMETHEON
            </span>
            <span className="text-xs text-muted-foreground">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {session?.email ?? `user ${(session?.userId ?? "?").slice(0, 8)}`}
            </span>
            <Link to="/admin/login" className="inline-flex rounded-sm border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted">
              Sign out
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/giveaway" className="text-sm text-muted-foreground hover:text-foreground">
            View public campaign
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-semibold text-foreground">Entries</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Protected back-office area for authorized Permetheon staff only.
        </p>
      </main>
    </div>
  );
}
