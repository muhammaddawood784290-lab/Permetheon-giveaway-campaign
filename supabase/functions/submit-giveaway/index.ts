// Supabase Edge Function — public giveaway entry submission
//
// Runtime: Supabase Edge Runtime (Deno-compatible).
// Auth: public (auth: 'none', verify_jwt = false) — see supabase/config.toml.
//
// This function is called directly from the static Hostinger frontend. It must:
//   - validate every field server-side with Zod
//   - enforce honeypot + fast-submit spam protection silently
//   - insert only approved fields with the service-role key
//   - never expose the service-role key to the browser
//   - return generic public error messages
//   - allow CORS only for the production campaign origin
//
// Secrets (set in the Supabase project, never committed):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Browser callers should send the project publishable key on the `apikey` header.
// The service-role key is used only server-side for the DB insert.

import { z } from "npm:zod@^3";

// ---------------------------------------------------------------------------
// Allowed values — mirror the database enum / form options exactly.
// District of Columbia is included because the frontend form lists it.
// ---------------------------------------------------------------------------

const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "District of Columbia",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
] as const;

const BUSINESS_STAGES = [
  "Existing business",
  "Startup",
  "Entrepreneur",
  "Preparing to launch",
] as const;

// ---------------------------------------------------------------------------
// Server-side input validation
// ---------------------------------------------------------------------------

const entrySchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(120),
  businessName: z.string().trim().min(1, "Business or project name is required").max(160),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .max(255)
    .email("Enter a valid email address"),
  usState: z.enum(US_STATES as readonly [string, ...string[]], {
    errorMap: () => ({ message: "Select a valid US state" }),
  }),
  businessStage: z.enum(BUSINESS_STAGES as readonly [string, ...string[]], {
    errorMap: () => ({ message: "Select a business stage" }),
  }),
  primaryGoal: z.string().trim().min(1, "Primary business goal is required").max(300),
  projectDescription: z
    .string()
    .trim()
    .min(10, "Please add a short description (at least 10 characters)")
    .max(2000),
  websiteUrl: z
    .string()
    .trim()
    .max(300, "Website URL must be under 300 characters")
    .optional()
    .default(""),
  services: z
    .array(z.string().max(120))
    .max(20, "Too many services selected")
    .optional()
    .default([]),
  rulesConsent: z.literal(true, {
    errorMap: () => ({
      message: "You must accept the Official Rules and Privacy Policy",
    }),
  }),
  marketingConsent: z.boolean().optional().default(false),
  // Spam-protection fields — never stored or trusted beyond protection checks.
  company_website: z
    .string()
    .max(300, "Invalid company website")
    .optional()
    .or(z.literal(""))
    .optional(),
  startedAt: z.number().int().positive("Invalid submission time").optional(),
});

// ---------------------------------------------------------------------------
// Server-controlled values — never accept these from the client.
// ---------------------------------------------------------------------------

const PRIVACY_VERSION = "privacy-v1";
const RULES_VERSION = "rules-v1";
const SOURCE_PAGE = "/giveaway";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// ---------------------------------------------------------------------------
// CORS — restricted to the production campaign origin.
// If the origin changes, update this set and redeploy.
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = new Set([
  "https://giveaway.permetheon.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
<<<<<<< HEAD
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:8081",
  "http://127.0.0.1:8081",
=======
>>>>>>> origin/main
]);

function originAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.has(origin);
}

// Build CORS headers for a specific allowed origin so the response is not
// wildcarded to any site.
function corsHeadersFor(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "apikey, content-type, x-client-info, x-retry-count, traceparent, tracestate, baggage",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

// Shared CORS headers used for preflight + error responses.
const CORS_ALLOW_ALL_HEADERS = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "apikey, content-type, x-client-info, x-retry-count, traceparent, tracestate, baggage",
  "Access-Control-Max-Age": "86400",
};

// ---------------------------------------------------------------------------
// Small Supabase JS client for the service-role insert.
// We create it ourselves rather than relying on @supabase/server's ctx client,
// so the function is explicit about which key does the insert.
// ---------------------------------------------------------------------------

const { createClient } = await import("npm:@supabase/supabase-js@^2");

function supabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase service configuration");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request): Promise<Response> {
    // Public functions must still handle preflight explicitly when they do not
    // use withSupabase.
    if (request.method === "OPTIONS") {
      const origin = request.headers.get("Origin");
      if (originAllowed(origin)) {
        return new Response(null, {
          status: 204,
          headers: {
            ...corsHeadersFor(origin),
            ...CORS_ALLOW_ALL_HEADERS,
          },
        });
      }
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "apikey, content-type, x-client-info, x-retry-count",
        },
      });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405, request.headers.get("Origin"));
    }

    // Missing secrets => service unavailable. Do not reveal which secret is
    // missing to callers.
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[submit-giveaway] Missing Supabase environment variables");
      return jsonResponse({ error: "Service unavailable" }, 503, request.headers.get("Origin"));
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid request" }, 400, request.headers.get("Origin"));
    }

    // Server-side validation — same rules as the client, enforced here too.
    const parsed = entrySchema.safeParse(payload);
    if (!parsed.success) {
      return jsonResponse({ error: "Validation failed" }, 400, request.headers.get("Origin"));
    }

    const data = parsed.data;

    // Spam protection: honeypot filled or implausibly fast submission.
    // Return success silently so we do not train spammers on the protection.
    if (data.company_website || (data.startedAt != null && Date.now() - data.startedAt < 3000)) {
      return jsonResponse({ ok: true }, 200, request.headers.get("Origin"));
    }

    // Insert only approved fields. Never trust client values for:
    //   email_normalized, duplicate_count, review_status, admin_notes,
    //   rules_version, privacy_version, source_page
    const sb = supabaseClient();
    const { error } = await sb.from("giveaway_entries").insert({
      full_name: data.fullName,
      business_name: data.businessName,
      email: data.email,
      us_state: data.usState,
      business_stage: data.businessStage,
      primary_goal: data.primaryGoal,
      project_description: data.projectDescription,
      website_url: data.websiteUrl || null,
      services_of_interest: data.services,
      rules_privacy_consent: true,
      marketing_consent: data.marketingConsent,
      rules_version: RULES_VERSION,
      privacy_version: PRIVACY_VERSION,
      source_page: SOURCE_PAGE,
    });

    if (error) {
      // Operational logging only — never echo entrant data back to callers.
      console.error("[submit-giveaway] Insert failed:", error.message);
      return jsonResponse(
        { error: "Could not save your entry. Please try again." },
        500,
        request.headers.get("Origin"),
      );
    }

    return jsonResponse({ ok: true }, 200, request.headers.get("Origin"));
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status: number, origin: string | null): Response {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (originAllowed(origin)) {
    Object.assign(headers, corsHeadersFor(origin));
  } else {
    Object.assign(headers, CORS_ALLOW_ALL_HEADERS);
  }

  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}
