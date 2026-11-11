import { entrySchema } from "./giveaway.schema";

declare global {
  interface Window {
    __SUPABASE_URL?: string;
    __SUPABASE_EDGE_FUNCTION_URL?: string;
  }
}

/**
 * Submit a giveaway entry directly to the Supabase Edge Function.
 *
 * This is a client-side function because the Hostinger deployment target is
 * static-only — TanStack Start server functions cannot run there. The Edge
 * Function (supabase/functions/submit-giveaway) handles server-side validation,
 * spam protection, and database insertion with the service-role key.
 *
 * Environment variables:
 * - SUPABASE_URL or window.__SUPABASE_URL
 * - SUPABASE_EDGE_FUNCTION_URL or window.__SUPABASE_EDGE_FUNCTION_URL
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
  const supabaseUrl =
    process.env["SUPABASE_URL"] ||
    (typeof window !== "undefined" ? window.__SUPABASE_URL : undefined) ||
    "";
  const edgeFunctionUrl =
    process.env["SUPABASE_EDGE_FUNCTION_URL"] ||
    (typeof window !== "undefined" ? window.__SUPABASE_EDGE_FUNCTION_URL : undefined) ||
    "";

  if (!supabaseUrl || !edgeFunctionUrl) {
    throw new Error("Giveaway submission is not configured.");
  }

  // Client-side spam pre-check: if honeypot is filled or submitted implausibly fast,
  // return success immediately without calling the Edge Function. The Edge Function
  // also enforces this server-side, but doing it client-side avoids an unnecessary
  // network round-trip for obvious spam.
  if (payload.company_website || Date.now() - payload.startedAt < 3000) {
    return { ok: true };
  }

  const response = await fetch(edgeFunctionUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({ error: "Request failed" }))) as {
    ok?: boolean;
    error?: string;
  };

  if (!response.ok || data.error) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }

  return data;
}
