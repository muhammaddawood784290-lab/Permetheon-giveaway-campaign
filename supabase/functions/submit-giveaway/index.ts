import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3";

// Copy of the entry schema for server-side validation in the Edge Function
const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
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

const entrySchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(120),
  businessName: z.string().trim().min(1, "Business name is required").max(160),
  email: z.string().trim().toLowerCase().min(3).max(255).email("Enter a valid email"),
  usState: z.enum(US_STATES as readonly [string, ...string[]], {
    errorMap: () => ({ message: "Select a valid US state" }),
  }),
  businessStage: z.enum(BUSINESS_STAGES as readonly [string, ...string[]], {
    errorMap: () => ({ message: "Select a business stage" }),
  }),
  primaryGoal: z.string().trim().min(1, "Primary goal is required").max(300),
  projectDescription: z
    .string()
    .trim()
    .min(10, "Please add a short description (at least 10 characters)")
    .max(2000),
  websiteUrl: z
    .string()
    .max(300, "Website URL must be under 300 characters")
    .optional()
    .or(z.literal(""))
    .optional(),
  services: z.array(z.string()).max(10).optional().default([]),
  rulesConsent: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Official Rules and Privacy Policy" }),
  }),
  marketingConsent: z.boolean().optional().default(false),
  company_website: z.string().max(300).optional().or(z.literal("")).optional(),
  startedAt: z.number().int().positive().optional(),
});

const PRIVACY_VERSION = "privacy-v1";
const RULES_VERSION = "rules-v1";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export async function handler(request: Request, context: { env: Env }) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = context.env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[submit-giveaway] Missing Supabase environment variables");
    return new Response(JSON.stringify({ error: "Service unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Server-side validation
  const parsed = entrySchema.safeParse(payload);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Validation failed" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const data = parsed.data;

  // Spam protection: honeypot filled or implausibly fast submission
  if (data.company_website || (data.startedAt != null && Date.now() - data.startedAt < 3000)) {
    // Silently accept to not reveal the protection
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sb = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

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
    source_page: "/giveaway",
  });

  if (error) {
    console.error("[submit-giveaway] Insert failed:", error.message);
    return new Response(JSON.stringify({ error: "Could not save your entry. Please try again." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// Minimal Database type for the Edge Function
type Database = {
  public: {
    Tables: {
      giveaway_entries: {
        Row: {
          id: string;
          created_at: string;
          full_name: string;
          business_name: string;
          email: string;
          us_state: string;
          business_stage: string;
          primary_goal: string;
          project_description: string;
          website_url: string | null;
          services_of_interest: string[];
          rules_privacy_consent: boolean;
          marketing_consent: boolean;
          rules_version: string;
          privacy_version: string;
          source_page: string;
          email_normalized: string | null;
          duplicate_count: number;
          review_status: string;
          admin_notes: string | null;
        };
        Insert: {
          full_name: string;
          business_name: string;
          email: string;
          us_state: string;
          business_stage: string;
          primary_goal: string;
          project_description: string;
          website_url?: string | null;
          services_of_interest?: string[];
          rules_privacy_consent: boolean;
          marketing_consent?: boolean;
          rules_version: string;
          privacy_version: string;
          source_page?: string;
        };
      };
    };
  };
};
