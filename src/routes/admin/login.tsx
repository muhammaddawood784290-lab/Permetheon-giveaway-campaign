import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import type { AuthError } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import { restoreAdminServerSession, syncAdminServerSession } from "@/lib/admin/session-sync";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field-label";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Admin sign in — Permetheon Giveaway" },
      { name: "description", content: "Sign in to review giveaway entries." },
    ],
  }),
});

/** Map Supabase Auth failures to messages an admin can act on. */
function describeAuthError(error: AuthError): string {
  if (error.code === "email_not_confirmed") {
    return "This email address has not been confirmed yet. Confirm it from the Supabase sign-up email, then try again.";
  }
  if (error.code === "invalid_credentials" || error.status === 400) {
    return "Invalid email or password.";
  }
  if (error.status === 429) {
    return "Too many sign-in attempts. Wait a moment and try again.";
  }
  return error.message || "Sign-in failed. Please try again.";
}

function LoginPage() {
  const router = useRouter();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [restoring, setRestoring] = useState(true);

  // A valid browser session should never be answered with a password prompt just
  // because the server cookie went stale: restore it and continue to the panel.
  useEffect(() => {
    let active = true;

    void (async () => {
      const result = await restoreAdminServerSession();
      if (!active) return;

      if (result.status === "restored") {
        await router.invalidate();
        await navigate({ to: "/admin/entries" });
        return;
      }

      if (result.status === "denied") setError(result.error);
      // "timeout" (and "error") fall through to the normal form: nothing could be
      // confirmed, so ask for credentials instead of waiting on the network.
      setRestoring(false);
    })();

    return () => {
      active = false;
    };
  }, [navigate, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      if (!supabaseConfigured) {
        setError(
          "Admin sign-in is not configured: the Supabase URL or publishable key is missing.",
        );
        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(describeAuthError(authError));
        return;
      }
      if (!data.session) {
        setError("Sign-in did not return a session. Please try again.");
        return;
      }

      // The server re-validates the token and enforces ADMIN_ALLOWLIST.
      const result = await syncAdminServerSession(data.session.access_token);

      if (!result.ok && result.reason === "timeout") {
        // Unknown outcome: the request may still land, so keep the browser session
        // and let the admin retry instead of discarding a possibly valid one.
        setError(result.error);
        return;
      }

      if (!result.ok) {
        // Not an authorized admin: drop the Supabase session again.
        await supabase.auth.signOut();
        setError(result.error);
        return;
      }

      setPassword("");
      await router.invalidate();
      await navigate({ to: "/admin/entries" });
    } catch {
      setError("Sign-in failed. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center bg-background px-5">
      <div className="w-full max-w-md border-border bg-card p-8 shadow-[var(--shadow-card)] sm:p-10">
        <p className="eyebrow text-muted-foreground">Admin sign in</p>
        <h1 className="mt-3 font-display text-3xl leading-tight">Review entries</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Sign in with an approved Permetheon admin account to review giveaway entries, update
          review status, add private notes, and export authorized data.
        </p>

        {restoring ? (
          <p className="mt-8 text-sm text-muted-foreground">Checking your session…</p>
        ) : null}

        <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <FieldLabel htmlFor="admin-email">Email</FieldLabel>
            <Input
              id="admin-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="admin-password">Password</FieldLabel>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-sm border border-destructive p-3 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

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
