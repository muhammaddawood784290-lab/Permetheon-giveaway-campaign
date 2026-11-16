import { entrySchema } from "./giveaway.schema";

declare global {
  interface Window {
    __SUPABASE_EDGE_FUNCTION_URL?: string;
    __SUPABASE_PUBLISHABLE_KEY?: string;
  }
}

/**
 * Submit a giveaway entry directly to the public Supabase Edge Function.
 *
 * This is a client-side function because the static deployment target cannot run
 * server functions. The Edge Function handles server-side validation, spam
 * protection, and database insertion with the service-role key.
 *
 * The browser calls the public Edge Function with the project's publishable key
 * on the `apikey` header. The service-role key is never used here and is never
 * exposed to the browser.
 *
 * Required public configuration:
 * - SUPABASE_EDGE_FUNCTION_URL or window.__SUPABASE_EDGE_FUNCTION_URL
 *
 * Optional config (used only for the "not configured" guard, not for the call):
 * - SUPABASE_PUBLISHABLE_KEY or window.__SUPABASE_PUBLISHABLE_KEY
 *
 * When the Edge Function URL is missing or the function is unreachable, this
 * throws a generic, user-safe error so the frontend can show a controlled
 * "submission is currently unavailable" message instead of leaking internals.
 */
export async function submitGiveawayEntry(payload: {
  fullName: string;
  businessName: string;
  email: string;
  usState: string;
  businessStage: string;
  primaryGoal: string;
  projectDescription: string;
  websiteUrl: string;
  services: string[];
  rulesConsent: boolean;
  marketingConsent: boolean;
  company_website: string;
  startedAt: number;
}) {
  const edgeFunctionUrl =
    import.meta.env.VITE_SUPABASE_EDGE_FUNCTION_URL ||
    process.env["SUPABASE_EDGE_FUNCTION_URL"] ||
    (typeof window !== "undefined" ? window.__SUPABASE_EDGE_FUNCTION_URL : undefined) ||
    "";

  if (!edgeFunctionUrl) {
    throw new Error("Giveaway submission is currently unavailable.");
  }

  // Client-side spam pre-check: if honeypot is filled or submitted implausibly fast,
  // return success immediately without calling the Edge Function. The Edge Function
  // also enforces this server-side, but doing it client-side avoids an unnecessary
  // network round-trip for obvious spam.
  if (payload.company_website || Date.now() - payload.startedAt < 3000) {
    return { ok: true };
  }

  let response: Response;
  try {
    response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          process.env["SUPABASE_PUBLISHABLE_KEY"] ||
          (typeof window !== "undefined" ? window.__SUPABASE_PUBLISHABLE_KEY : undefined) ||
          "",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Giveaway submission is currently unavailable.");
  }

  const data = (await response.json().catch(() => ({ error: "Request failed" }))) as {
    ok?: boolean;
    error?: string;
  };

  if (!response.ok || data.error) {
    throw new Error(
      data.error || "Giveaway submission is currently unavailable. Please try again in a moment.",
    );
  }

  return data;
}
