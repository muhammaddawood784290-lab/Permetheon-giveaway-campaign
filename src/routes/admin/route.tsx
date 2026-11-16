<<<<<<< HEAD
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
=======
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
>>>>>>> origin/main
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
<<<<<<< HEAD
    // /admin/login stays publicly reachable; no session check runs on login.
    if (path.startsWith("/admin/entries")) {
      const auth = await adminEntryAuth();

      // If the request does not carry a Bearer token, redirect to login.
=======
    // /admin/login stays publicly reachable, and the public / index route is
    // handled by its own beforeLoad redirect. For non-entries routes (e.g.
    // /admin/login), skip the session check to keep them publicly reachable.
    if (path.startsWith("/admin/entries")) {
      // Server-only server-fn boundary reads the incoming request's
      // Authorization header and reports whether a Bearer token is present.
      // The client route file never imports @tanstack/react-start/server.
      const auth = await adminEntryAuth();

      // 2. If it is missing or does not start with "Bearer ", redirect to login.
>>>>>>> origin/main
      if (!auth.hasAuth) {
        throw redirect({
          to: auth.redirectTo,
          search: auth.redirectSearch,
        });
      }

<<<<<<< HEAD
      // Only call getAdminSession() when a Bearer header exists.
      const session = await getAdminSession();

=======
      // 3. Only call getAdminSession() when a Bearer header exists.
      const session = await getAdminSession();

      // 4. Preserve the existing authenticated-session and admin allowlist checks.
>>>>>>> origin/main
      if (!session?.authenticated || !session?.authorized) {
        throw redirect({ to: "/admin/login", search: { error: "unauthorized" } });
      }
      return session;
    }

<<<<<<< HEAD
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

=======
    // Non-entries paths: no session check; return null. Public routes handled by
    // sibling route logic (e.g. / index.tsx beforeLoad redirect to /giveaway).
    return null;
  },
  component: AdminLayout,
});

function AdminLayout() {
  const session = Route.useLoaderData();

>>>>>>> origin/main
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
<<<<<<< HEAD
              {session?.email ?? `user ${(session?.userId ?? "?").slice(0, 8)}`}
            </span>
            <Link to="/admin/login" className="inline-flex rounded-sm border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted">
=======
              {(session as { email?: string; userId?: string } | null | undefined)?.email ??
                `user ${(session as { userId?: string } | null | undefined)?.userId?.slice(0, 8) ?? "?"}`}
            </span>
            <Link
              to="/admin/login"
              className="inline-flex rounded-sm border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted"
            >
>>>>>>> origin/main
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
