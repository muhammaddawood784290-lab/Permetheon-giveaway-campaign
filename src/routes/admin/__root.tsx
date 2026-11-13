import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { adminSession } from "@/lib/admin/functions/session";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

const getAdminSession = createServerFn({ method: "GET" })
  .validator(() => ({}))
  .handler(async () => {
    return adminSession();
  });

export const Route = createFileRoute("/admin/__root")({
  loader: async () => {
    try {
      const session = await getAdminSession();
      if (!session?.authenticated || !session?.authorized) {
        throw redirect({ to: "/admin/login", search: { error: "unauthorized" } });
      }
      return session;
    } catch (error) {
      if (error instanceof Response && error.status >= 400 && error.status < 500) {
        throw error;
      }
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const session = Route.useLoaderData();

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
              {(session as { email?: string; userId?: string } | null | undefined)?.email ??
                `user ${(session as { userId?: string } | null | undefined)?.userId?.slice(0, 8) ?? "?"}`}
            </span>
            <Link
              to="/admin/login"
              className="inline-flex rounded-sm border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted"
            >
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
