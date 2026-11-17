import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import { adminSignOut, adminStartSession } from "@/lib/admin/functions/login";

/**
 * Keeps the server-side admin cookie aligned with the browser Supabase session.
 *
 * The browser client owns the session and is the only thing that refreshes it.
 * Whenever it rotates the access token, the new token is pushed to the server so
 * server-rendered admin routes keep authorizing reloads and direct links instead
 * of falling back to the login page.
 *
 * Race fencing:
 * 1. A push is dropped after sign-out if its epoch is stale (no request at all).
 * 2. A push already on the wire when sign-out happens cleans up after itself, and
 *    only for the token it wrote, so it cannot delete a newer session's cookie.
 *    Every wait sign-out depends on — its own browser revoke, the drain, the cookie
 *    delete, a stale push's cleanup, and the denied-restore revoke — is bounded, so
 *    a stuck request costs a caller its limit instead of hanging it.
 * 3. Sign-out drains what is on the wire before deleting the cookie last, and the
 *    whole sequence runs under one deadline so no stalled call can hang it.
 * 4. Every document signs out through the epoch bump, including one where another
 *    tab clicked Sign out, so a late landing cannot restore the shared cookie.
 */

export type AdminSessionRestore =
  | { status: "restored" }
  | { status: "none" }
  | { status: "denied"; error: string }
  /** No session could be confirmed in time: fall back to the normal sign-in form. */
  | { status: "timeout" }
  | { status: "error" };

export type SyncFailureReason =
  | "unconfigured"
  | "expired"
  | "unauthorized"
  | "signed-out"
  | "unreachable"
  /** The server did not answer in time; the request may still land on its own. */
  | "timeout";

export type SyncSessionResult =
  { ok: true } | { ok: false; reason: SyncFailureReason; error: string };

type SyncState = {
  /** Bumped on sign-out; a push that captured an older epoch is stale. */
  epoch: number;
  /** Requests currently talking to the server, so sign-out can wait them out. */
  inFlight: Set<Promise<unknown>>;
  /** Last token already mirrored into the cookie, to avoid duplicate pushes. */
  lastSyncedToken: string | null;
};

/**
 * Held on `globalThis` so every copy of this module shares one fence. A duplicated
 * module instance (dev HMR, separate chunks) must not keep its own epoch, or a
 * sync started by one copy could outlive a sign-out performed by the other.
 */
const state: SyncState = ((
  globalThis as unknown as { permetheonAdminSync?: SyncState }
).permetheonAdminSync ??= { epoch: 0, inFlight: new Set(), lastSyncedToken: null });

const UNCONFIGURED =
  "Admin sign-in is not configured: the Supabase URL or publishable key is missing.";

/** How long a Supabase browser sign-out may hold the caller before we move on. */
const BROWSER_SIGN_OUT_LIMIT_MS = 2_500;
/** How long a cookie cleanup may hold the caller before we move on. */
const COOKIE_CLEANUP_LIMIT_MS = 2_000;
/** How long the browser session lookup may take before restore gives up. */
const SESSION_LOOKUP_LIMIT_MS = 3_000;
/** How long a caller waits for the server to confirm a token. */
const TOKEN_PUSH_LIMIT_MS = 5_000;

const TOKEN_PUSH_TIMEOUT =
  "The admin server did not confirm your session in time. Please try again.";

const TIMED_OUT = Symbol("timed-out");

/**
 * Race `work` against an absolute deadline. The work's own outcome wins when it
 * arrives first, including a rejection, which is rethrown to the caller. Handlers
 * are attached up front so a late settlement is never an unhandled rejection, even
 * when the deadline has already passed.
 */
function settledWithin<T>(work: Promise<T>, deadline: number): Promise<T | typeof TIMED_OUT> {
  const raced = work.then(
    (value) => ({ rejected: false as const, value }),
    (error: unknown) => ({ rejected: true as const, error }),
  );
  const remaining = Math.max(deadline - Date.now(), 0);

  return Promise.race([
    raced.then((outcome) => {
      if (outcome.rejected) throw outcome.error;
      return outcome.value;
    }),
    new Promise<typeof TIMED_OUT>((resolve) => setTimeout(() => resolve(TIMED_OUT), remaining)),
  ]);
}

/**
 * Wait for `work` (already started by the caller) until an absolute deadline, then
 * stop waiting. The outcome is irrelevant: the point is that one stalled request
 * cannot hold the caller, never that the request is cancelled or its errors handled.
 */
async function untilDeadline(work: Promise<unknown>, deadline: number): Promise<void> {
  await settledWithin(
    work.then(
      () => undefined,
      () => undefined,
    ),
    deadline,
  );
}

/**
 * Mirror an access token into the server cookie. The server re-validates the
 * token and re-checks ADMIN_ALLOWLIST, so this only ever grants what the server
 * already agreed to. Used by both sign-in and token refresh.
 *
 * Callers get a bounded answer: a request that has not come back within
 * `TOKEN_PUSH_LIMIT_MS` is reported as `reason: "timeout"` and keeps running in the
 * background, where it still performs its own epoch check and token-scoped cleanup.
 */
export async function syncAdminServerSession(accessToken: string): Promise<SyncSessionResult> {
  const epoch = state.epoch;

  if (!supabaseConfigured) {
    return { ok: false, reason: "unconfigured", error: UNCONFIGURED };
  }

  const request = (async (): Promise<SyncSessionResult> => {
    try {
      const result = await adminStartSession({ data: { accessToken } });

      if (epoch !== state.epoch) {
        // Signed out while this was on the wire: remove the cookie this request
        // just wrote, but only if it still holds this token. Bounded, so a cleanup
        // that never answers still lets this push settle and leave `inFlight`
        // instead of making every later sign-out drain in full.
        await untilDeadline(
          adminSignOut({ data: { accessToken } }),
          Date.now() + COOKIE_CLEANUP_LIMIT_MS,
        );
        return { ok: false, reason: "signed-out", error: "Signed out." };
      }

      state.lastSyncedToken = result.ok ? accessToken : null;
      return result.ok ? { ok: true } : { ok: false, reason: result.reason, error: result.error };
    } catch {
      state.lastSyncedToken = null;
      return { ok: false, reason: "unreachable", error: "Could not reach the admin server." };
    }
  })();

  // Tracked before waiting, so sign-out still drains a push whose caller gave up.
  state.inFlight.add(request);
  void request.finally(() => state.inFlight.delete(request));

  const outcome = await settledWithin(request, Date.now() + TOKEN_PUSH_LIMIT_MS);
  if (outcome === TIMED_OUT) return { ok: false, reason: "timeout", error: TOKEN_PUSH_TIMEOUT };

  return outcome;
}

/**
 * Re-attach an existing browser session to the server, refreshing it first when
 * Supabase reports it as expired. Used when a stale cookie sends an otherwise
 * signed-in admin to the login page.
 */
export async function restoreAdminServerSession(): Promise<AdminSessionRestore> {
  if (!supabaseConfigured) return { status: "none" };

  const epoch = state.epoch;

  try {
    // getSession refreshes an expired access token before returning it, so it can go
    // to the network. Bounded: the login form must never wait on it.
    const found = await settledWithin(
      supabase.auth.getSession(),
      Date.now() + SESSION_LOOKUP_LIMIT_MS,
    );
    if (found === TIMED_OUT) return { status: "timeout" };

    const { data, error } = found;
    // Sign-out during the refresh wins: never write a cookie for it.
    if (error || epoch !== state.epoch) return { status: "none" };

    const accessToken = data.session?.access_token;
    if (!accessToken) return { status: "none" };

    const result = await syncAdminServerSession(accessToken);
    if (result.ok) return { status: "restored" };
    if (result.reason === "timeout") return { status: "timeout" };
    if (result.reason !== "unauthorized") return { status: "error" };

    // Bounded: the login page renders this denial, so a stalled revoke must not
    // leave the page waiting on it.
    await untilDeadline(supabase.auth.signOut(), Date.now() + BROWSER_SIGN_OUT_LIMIT_MS);
    return { status: "denied", error: result.error };
  } catch {
    return { status: "error" };
  }
}

/**
 * Subscribe to token refreshes and sign-ins, mirroring each new token into the
 * server cookie, and fence off pending pushes on sign-out. Returns an
 * unsubscribe function.
 */
export function startAdminSessionSync(): () => void {
  if (!supabaseConfigured || typeof window === "undefined") return () => {};

  const { data } = supabase.auth.onAuthStateChange(
    (event: AuthChangeEvent, session: Session | null) => {
      if (event === "SIGNED_OUT") {
        // The cookie is shared by every tab, but the epoch is per document, so a
        // tab that did not run endAdminSession still has to fence: a push it left
        // on the wire would otherwise land after another tab deleted the cookie and
        // restore it. Bumping here makes that push stale, so it cleans up the
        // token it wrote instead.
        state.epoch += 1;
        state.lastSyncedToken = null;
        return;
      }

      if (event !== "TOKEN_REFRESHED" && event !== "SIGNED_IN") return;

      const accessToken = session?.access_token;
      if (!accessToken || accessToken === state.lastSyncedToken) return;

      // Background caller: not awaited (Supabase runs this callback under its auth
      // lock) and a failure or timeout is swallowed, since the admin sees the next
      // navigation's outcome instead. Nothing about the token is logged.
      void syncAdminServerSession(accessToken).catch(() => undefined);
    },
  );

  return () => data.subscription.unsubscribe();
}

/** Total budget for sign-out: nothing inside it may hold the button longer. */
const SIGN_OUT_DEADLINE_MS = 5_000;

/**
 * Wait for in-flight pushes, but never past the deadline: requests stuck on a dead
 * connection must not leave Sign out pending. A push that lands after the deadline
 * still holds a stale epoch, so it removes the cookie it wrote.
 */
async function drainInFlight(deadline: number): Promise<void> {
  while (state.inFlight.size > 0) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return;

    await Promise.race([
      Promise.allSettled([...state.inFlight]),
      new Promise((resolve) => setTimeout(resolve, remaining)),
    ]);
  }
}

/**
 * Sign out for good: fence off pending token syncs, clear the browser session,
 * drain whatever is still on the wire (including a push started while the browser
 * session was being cleared), then delete the server cookie last so no late write
 * can resurrect it.
 *
 * The whole sequence shares one deadline (`SIGN_OUT_DEADLINE_MS`), and each step is
 * only awaited until its part of it runs out, so a hung Supabase call or a stuck
 * request costs the click a bounded wait instead of blocking it. The cookie delete
 * is still fired even when the budget is already spent: callers that navigate away
 * must not be able to leave the server session alive.
 */
export async function endAdminSession(): Promise<void> {
  const startedAt = Date.now();
  const deadline = startedAt + SIGN_OUT_DEADLINE_MS;

  state.epoch += 1;
  state.lastSyncedToken = null;

  await untilDeadline(supabase.auth.signOut(), startedAt + BROWSER_SIGN_OUT_LIMIT_MS);
  await drainInFlight(deadline);
  await untilDeadline(adminSignOut({ data: {} }), deadline);
}
