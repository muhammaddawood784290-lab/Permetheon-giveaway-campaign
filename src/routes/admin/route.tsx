import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { adminSession } from "@/lib/admin/functions/session";
import { endAdminSession, startAdminSessionSync } from "@/lib/admin/session-sync";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  loader: async ({ location }) => {
    // /admin/login is the only public page under /admin; everything else needs a
    // session, including the bare /admin path, which has no page of its own.
    if (location.pathname.startsWith("/admin/login")) return null;

    const session = await adminSession();
    if (!session.authenticated || !session.authorized) {
      throw redirect({ to: "/admin/login" });
    }
    return session;
  },
  component: AdminLayout,
});

function AdminLayout() {
  const session = Route.useLoaderData();

  // Supabase rotates the access token in the browser; mirror every rotation into
  // the server cookie so later reloads stay authorized.
  useEffect(() => startAdminSessionSync(), []);

  // Public admin pages render standalone, without the protected shell.
  if (!session) {
    return <Outlet />;
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
            <span className="text-xs text-muted-foreground">{session.email ?? "admin"}</span>
            <SignOutButton />
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
        <Outlet />
      </main>
    </div>
  );
}

function SignOutButton() {
  const router = useRouter();
  const navigate = useNavigate();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        // Drains pending token syncs, clears the browser session, then the cookie.
        await endAdminSession();
        await router.invalidate();
        await navigate({ to: "/admin/login" });
      }}
    >
      Sign out
    </Button>
  );
}
