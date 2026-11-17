import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
  startSession: vi.fn(),
  signOutAdmin: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabaseConfigured: true,
  supabase: {
    auth: {
      getSession: mocks.getSession,
      signOut: mocks.signOut,
      onAuthStateChange: mocks.onAuthStateChange,
    },
  },
}));

vi.mock("@/lib/admin/functions/login", () => ({
  adminStartSession: mocks.startSession,
  adminSignOut: mocks.signOutAdmin,
}));

import {
  endAdminSession,
  restoreAdminServerSession,
  startAdminSessionSync,
  syncAdminServerSession,
} from "@/lib/admin/session-sync";

/**
 * The fence state is shared through `globalThis`, so each test resets it in place
 * rather than re-importing the module (the module keeps its reference).
 */
type FenceState = { epoch: number; inFlight: Set<unknown>; lastSyncedToken: string | null };

function fence(): FenceState {
  return (globalThis as unknown as { permetheonAdminSync: FenceState }).permetheonAdminSync;
}

const session = (accessToken: string | null) => ({
  data: { session: accessToken ? { access_token: accessToken } : null },
  error: null,
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  vi.resetAllMocks();

  const state = fence();
  state.epoch = 0;
  state.inFlight.clear();
  state.lastSyncedToken = null;

  mocks.signOut.mockResolvedValue({ error: null });
  mocks.signOutAdmin.mockResolvedValue({ ok: true });
});

describe("restoreAdminServerSession", () => {
  it("does nothing when the browser has no session", async () => {
    mocks.getSession.mockResolvedValue(session(null));

    await expect(restoreAdminServerSession()).resolves.toEqual({ status: "none" });
    expect(mocks.startSession).not.toHaveBeenCalled();
    expect(mocks.signOutAdmin).not.toHaveBeenCalled();
  });

  it("mirrors an existing browser session into the server cookie", async () => {
    mocks.getSession.mockResolvedValue(session("token-1"));
    mocks.startSession.mockResolvedValue({ ok: true, session: {} });

    await expect(restoreAdminServerSession()).resolves.toEqual({ status: "restored" });

    expect(mocks.startSession).toHaveBeenCalledTimes(1);
    expect(mocks.startSession).toHaveBeenCalledWith({ data: { accessToken: "token-1" } });
    expect(fence().lastSyncedToken).toBe("token-1");
  });

  it("drops the browser session when the account is not an authorized admin", async () => {
    mocks.getSession.mockResolvedValue(session("token-1"));
    mocks.startSession.mockResolvedValue({
      ok: false,
      reason: "unauthorized",
      error: "That account is not an authorized admin.",
    });

    await expect(restoreAdminServerSession()).resolves.toEqual({
      status: "denied",
      error: "That account is not an authorized admin.",
    });
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(fence().lastSyncedToken).toBeNull();
  });

  it("shows the denial even when revoking the browser session stalls", async () => {
    vi.useFakeTimers();

    try {
      mocks.getSession.mockResolvedValue(session("token-1"));
      mocks.startSession.mockResolvedValue({
        ok: false,
        reason: "unauthorized",
        error: "That account is not an authorized admin.",
      });
      mocks.signOut.mockImplementation(() => new Promise(() => undefined)); // never settles

      const restoring = restoreAdminServerSession();
      await vi.advanceTimersByTimeAsync(0); // getSession and the rejected push settle
      await vi.advanceTimersByTimeAsync(3_000); // past the revoke limit

      // The login page still renders the denial instead of waiting on the revoke.
      await expect(restoring).resolves.toEqual({
        status: "denied",
        error: "That account is not an authorized admin.",
      });
      expect(mocks.signOut).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the browser session when the server rejects an expired token", async () => {
    mocks.getSession.mockResolvedValue(session("token-1"));
    mocks.startSession.mockResolvedValue({
      ok: false,
      reason: "expired",
      error: "Your session has expired. Please sign in again.",
    });

    await expect(restoreAdminServerSession()).resolves.toEqual({ status: "error" });
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("loses to a sign-out that happens while the session is being fetched", async () => {
    let releaseGet!: () => void;
    mocks.getSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseGet = () => resolve(session("token-1"));
        }),
    );

    const restore = restoreAdminServerSession();
    const signOut = endAdminSession();
    releaseGet();

    await expect(restore).resolves.toEqual({ status: "none" });
    await signOut;

    expect(mocks.startSession).not.toHaveBeenCalled();
    expect(fence().lastSyncedToken).toBeNull();
  });

  it("gives up on a stalled session lookup and reports a timeout", async () => {
    vi.useFakeTimers();

    try {
      mocks.getSession.mockImplementation(() => new Promise(() => undefined)); // never settles

      const restoring = restoreAdminServerSession();
      await vi.advanceTimersByTimeAsync(4_000); // past the session lookup limit

      // The login page can show the normal form instead of "Checking your session…".
      await expect(restoring).resolves.toEqual({ status: "timeout" });
      expect(mocks.startSession).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("reports a timeout when the server never confirms the token", async () => {
    vi.useFakeTimers();

    try {
      mocks.getSession.mockResolvedValue(session("token-1"));
      mocks.startSession.mockImplementation(() => new Promise(() => undefined)); // never settles

      const restoring = restoreAdminServerSession();
      await vi.advanceTimersByTimeAsync(6_000); // past the token push limit

      await expect(restoring).resolves.toEqual({ status: "timeout" });
      // The push never landed, so there is no cookie of ours to clean up.
      expect(mocks.signOutAdmin).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("endAdminSession fence", () => {
  it("drains an in-flight token push and deletes the cookie last", async () => {
    const log: string[] = [];
    let releasePush!: () => void;

    mocks.getSession.mockResolvedValue(session("token-1"));
    mocks.startSession.mockImplementation(async () => {
      log.push("push:start");
      await new Promise<void>((resolve) => {
        releasePush = resolve;
      });
      log.push("push:landed");
      return { ok: true, session: {} };
    });
    mocks.signOut.mockImplementation(async () => {
      log.push("browser-signout");
      return { error: null };
    });
    mocks.signOutAdmin.mockImplementation(async (input: { data: { accessToken?: string } }) => {
      // "all" is sign-out deleting outright; a token is a stale push cleaning up.
      log.push(
        input.data.accessToken ? `cookie-delete:${input.data.accessToken}` : "cookie-delete:all",
      );
      return { ok: true };
    });

    const restore = restoreAdminServerSession();
    await flush(); // getSession resolved, the push is on the wire and gated
    const signOut = endAdminSession();
    releasePush();

    await signOut;
    await restore;

    // The late write lands, then its own cleanup runs, then sign-out deletes: the
    // cookie delete is last, so no write can follow it.
    expect(log).toEqual([
      "push:start",
      "browser-signout",
      "push:landed",
      "cookie-delete:token-1",
      "cookie-delete:all",
    ]);
    expect(fence().lastSyncedToken).toBeNull();
  });

  it("only lets a stale push delete the cookie it wrote", async () => {
    let releasePush!: () => void;

    mocks.getSession.mockResolvedValue(session("token-1"));
    mocks.startSession.mockImplementation(async () => {
      await new Promise<void>((resolve) => {
        releasePush = resolve;
      });
      return { ok: true, session: {} };
    });

    const restore = restoreAdminServerSession();
    await flush(); // getSession resolved, the push is on the wire and gated
    const signOut = endAdminSession();
    releasePush();
    await signOut;
    await restore;

    // The stale push scopes its cleanup to its own token; sign-out deletes outright.
    expect(mocks.signOutAdmin).toHaveBeenCalledWith({ data: { accessToken: "token-1" } });
    expect(mocks.signOutAdmin).toHaveBeenCalledWith({ data: {} });
  });

  it("stops waiting on a stuck push and deletes the cookie anyway", async () => {
    vi.useFakeTimers();

    try {
      let releasePush!: () => void;
      mocks.getSession.mockResolvedValue(session("token-1"));
      mocks.startSession.mockImplementation(
        () =>
          new Promise((resolve) => {
            releasePush = () => resolve({ ok: true, session: {} });
          }),
      );

      const restore = restoreAdminServerSession();
      await vi.advanceTimersByTimeAsync(0); // getSession settled: the push is the stuck one
      expect(fence().inFlight.size).toBe(1);

      const signOut = endAdminSession();
      await vi.advanceTimersByTimeAsync(0); // browser sign-out done, drain armed
      await vi.advanceTimersByTimeAsync(5_000); // past the drain limit

      await signOut; // resolved rather than waiting on a request that never returns
      expect(mocks.signOutAdmin).toHaveBeenCalledWith({ data: {} });
      expect(fence().inFlight.size).toBe(1);

      // A push that lands after the limit is still fenced, so it cannot restore
      // the cookie that sign-out just deleted. `restore` already returned its
      // timeout, so the landing is observed through the fence itself.
      releasePush();
      await restore;
      await vi.advanceTimersByTimeAsync(0); // let the late landing finish its cleanup

      expect(mocks.signOutAdmin).toHaveBeenLastCalledWith({ data: { accessToken: "token-1" } });
      expect(fence().inFlight.size).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("settles a push whose stale cleanup stalls", async () => {
    vi.useFakeTimers();

    try {
      let releasePush!: () => void;
      mocks.getSession.mockResolvedValue(session("token-1"));
      mocks.startSession.mockImplementation(
        () =>
          new Promise((resolve) => {
            releasePush = () => resolve({ ok: true, session: {} });
          }),
      );
      // The token-scoped cleanup never comes back; sign-out's own delete does.
      mocks.signOutAdmin.mockImplementation((input: { data: { accessToken?: string } }) =>
        input.data.accessToken ? new Promise(() => undefined) : Promise.resolve({ ok: true }),
      );

      const restore = restoreAdminServerSession();
      await vi.advanceTimersByTimeAsync(0);
      expect(fence().inFlight.size).toBe(1);

      const signOut = endAdminSession();
      await vi.advanceTimersByTimeAsync(0); // browser sign-out done, drain armed
      releasePush(); // the push lands stale and starts its cleanup…
      await vi.advanceTimersByTimeAsync(2_500); // …which is capped

      // Without the cap the push never settles, so sign-out spends its whole drain
      // and this push stays in `inFlight` forever.
      await signOut;
      await expect(restore).resolves.toEqual({ status: "error" });
      expect(fence().inFlight.size).toBe(0);
      expect(mocks.signOutAdmin).toHaveBeenCalledWith({ data: {} });
    } finally {
      vi.useRealTimers();
    }
  });

  it("finishes even when the browser sign-out stalls", async () => {
    vi.useFakeTimers();

    try {
      // Supabase's revoke call never comes back.
      mocks.signOut.mockImplementation(() => new Promise(() => undefined));

      const signOut = endAdminSession();
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(3_000); // past the browser slice, inside the deadline

      await signOut; // returned instead of waiting on the stalled call
      expect(mocks.signOutAdmin).toHaveBeenCalledWith({ data: {} });
      expect(fence().epoch).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("still fires the cookie delete when the deadline is spent", async () => {
    vi.useFakeTimers();

    try {
      mocks.signOut.mockImplementation(() => new Promise(() => undefined));
      let releasePush!: () => void;
      mocks.getSession.mockResolvedValue(session("token-1"));
      mocks.startSession.mockImplementation(
        () =>
          new Promise((resolve) => {
            releasePush = () => resolve({ ok: true, session: {} });
          }),
      );

      const restore = restoreAdminServerSession();
      await vi.advanceTimersByTimeAsync(0);
      expect(fence().inFlight.size).toBe(1);

      const signOut = endAdminSession();
      await vi.advanceTimersByTimeAsync(10_000); // browser slice and drain both expire
      await signOut;

      // Nothing left in the budget, but the delete is still sent: a stalled call
      // cannot leave the server session alive.
      expect(mocks.signOutAdmin).toHaveBeenCalledWith({ data: {} });

      releasePush();
      await restore;
      await vi.advanceTimersByTimeAsync(0);

      expect(fence().inFlight.size).toBe(0);
      expect(mocks.signOutAdmin).toHaveBeenLastCalledWith({ data: { accessToken: "token-1" } });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("syncAdminServerSession timeout", () => {
  it("returns a typed timeout and still cleans up when the push lands stale", async () => {
    vi.useFakeTimers();

    try {
      let releasePush!: () => void;
      mocks.startSession.mockImplementation(
        () =>
          new Promise((resolve) => {
            releasePush = () => resolve({ ok: true, session: {} });
          }),
      );

      const push = syncAdminServerSession("token-1");
      await vi.advanceTimersByTimeAsync(6_000); // past the token push limit

      // The interactive caller gets a typed failure instead of hanging.
      expect(await push).toMatchObject({ ok: false, reason: "timeout" });
      // ...while the request stays tracked so sign-out can still drain it.
      expect(fence().inFlight.size).toBe(1);

      // A sign-out during the wait still fences the late landing.
      fence().epoch += 1;
      releasePush();
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(0);

      expect(mocks.signOutAdmin).toHaveBeenCalledWith({ data: { accessToken: "token-1" } });
      expect(fence().inFlight.size).toBe(0);
      expect(fence().lastSyncedToken).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("startAdminSessionSync", () => {
  type Handler = (event: string, session: unknown) => void;

  function start(): { handler: Handler; stop: () => void } {
    let handler: Handler | undefined;
    const unsubscribe = vi.fn();
    mocks.onAuthStateChange.mockImplementation((cb: Handler) => {
      handler = cb;
      return { data: { subscription: { unsubscribe } } };
    });

    const stop = startAdminSessionSync();
    if (!handler) throw new Error("startAdminSessionSync did not subscribe");
    return { handler, stop: () => (stop(), unsubscribe()) };
  }

  it("mirrors a rotated token once and ignores unrelated events", async () => {
    mocks.startSession.mockResolvedValue({ ok: true, session: {} });
    const { handler, stop } = start();

    handler("SIGNED_OUT", null);
    await flush();
    expect(mocks.startSession).not.toHaveBeenCalled();

    handler("TOKEN_REFRESHED", { access_token: "token-1" });
    await flush();
    expect(mocks.startSession).toHaveBeenCalledTimes(1);

    // Same token again: nothing new to mirror.
    handler("TOKEN_REFRESHED", { access_token: "token-1" });
    await flush();
    expect(mocks.startSession).toHaveBeenCalledTimes(1);

    handler("TOKEN_REFRESHED", { access_token: "token-2" });
    await flush();
    expect(mocks.startSession).toHaveBeenCalledTimes(2);
    expect(fence().lastSyncedToken).toBe("token-2");

    stop();
    expect(mocks.onAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it("fences its own pending push when another tab signs out", async () => {
    let releasePush!: () => void;
    mocks.startSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          releasePush = () => resolve({ ok: true, session: {} });
        }),
    );
    const { handler } = start();

    handler("TOKEN_REFRESHED", { access_token: "token-1" });
    await flush();
    expect(fence().inFlight.size).toBe(1);

    // Another tab clicked Sign out; Supabase broadcasts it into this document,
    // which shares the cookie but not the other tab's fence.
    handler("SIGNED_OUT", null);
    expect(fence().epoch).toBe(1);

    releasePush();
    await flush();
    await flush();

    // The push landed after the broadcast, so it removed only the cookie it wrote
    // instead of resurrecting the session.
    expect(mocks.signOutAdmin).toHaveBeenCalledTimes(1);
    expect(mocks.signOutAdmin).toHaveBeenCalledWith({ data: { accessToken: "token-1" } });
    expect(fence().lastSyncedToken).toBeNull();
  });
});
