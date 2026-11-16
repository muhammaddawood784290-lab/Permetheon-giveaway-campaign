import { createFileRoute } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const getAdminLoginUrl = createServerFn({ method: "GET" })
  .validator(() => ({}))
  .handler(async () => {
    const { buildAdminLoginUrl } = await import("@/lib/admin/auth.server");
    return { url: buildAdminLoginUrl("/admin/entries") };
  });

export const Route = createFileRoute("/admin/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Admin sign in — Permetheon Giveaway" },
      { name: "description", content: "Sign in to review giveaway entries." },
    ],
  }),
});

function LoginPage() {
  const getAdminLoginUrlFn = useServerFn(getAdminLoginUrl);
  const [loginUrl, setLoginUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [built, setBuilt] = useState(false);

  if (!built) {
    setBuilt(true);
    getAdminLoginUrlFn()
      .then((result) => setLoginUrl(result.url))
      .catch(() => setError("Sign-in is not configured"))
      .finally(() => setLoading(false));
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center bg-background px-5">
      <div className="w-full max-w-md border-border bg-card p-8 shadow-[var(--shadow-card)] sm:p-10">
        <p className="eyebrow text-muted-foreground">Admin sign in</p>
        <h1 className="mt-3 font-display text-3xl leading-tight">Review entries</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Sign in with an approved Permetheon admin account to review giveaway entries, update
          review status, add private notes, and export authorized data.
        </p>

        {error ? (
          <p className="mt-4 rounded-sm border border-foreground p-3 text-sm">{error}</p>
        ) : null}

        {loginUrl ? (
          <div className="mt-6 space-y-3">
            <a
              href={loginUrl}
              className="inline-flex items-center justify-center rounded-sm bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-85"
            >
              Continue to sign in
            </a>
            <p className="text-xs text-muted-foreground">
              This takes you to the Supabase sign-in page. After signing in, you will be returned to
              the entries list if you are authorized.
            </p>
          </div>
        ) : null}

        <div className="mt-8 border-t border-border pt-6 text-xs text-muted-foreground">
          <p className="mb-2">Access is restricted to authorized admin accounts.</p>
          <p>If you believe you should have access, contact the campaign administrator.</p>
        </div>

        <div className="mt-6 flex justify-end">
          <Link
            to="/"
            className="inline-flex rounded-sm border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted"
          >
            Back to campaign
          </Link>
        </div>
      </div>
    </div>
  );
}
