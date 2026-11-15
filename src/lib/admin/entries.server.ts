/**
 * Admin entry access layer.
 *
 * Admin reads and writes in this project use the service-role client
 * (`supabaseAdmin`) by default, because the public `giveaway_entries` table
 * currently has only an INSERT RLS policy. That means an authenticated admin
 * user does not yet have RLS-based read/update access to entries.
 *
 * Once the project adds reviewed admin RLS policies, specific admin reads can
 * switch to the RLS-scoped client from `requireSupabaseAuth`. The notes at the
 * bottom of this file document the required policy shape.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

// ---------------------------------------------------------------------------
// Reference lists
// ---------------------------------------------------------------------------

export const REVIEW_STATUSES = [
  "pending",
  "valid",
  "invalid",
  "duplicate",
  "finalist",
  "winner",
] as const;

export const BUSINESS_STAGES = [
  "Existing business",
  "Startup",
  "Entrepreneur",
  "Preparing to launch",
] as const;

export const US_STATES = [
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EntryFilters = {
  search?: string;
  reviewStatus?: string;
  usState?: string;
  businessStage?: string;
  marketingConsent?: "any" | "yes" | "no";
  fromDate?: string;
  toDate?: string;
};

export type EntrySort = {
  field:
    "created_at" | "full_name" | "email" | "business_name" | "review_status" | "duplicate_count";
  dir: "asc" | "desc";
};

export type EntryRow = {
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
  marketing_consent: boolean;
  rules_version: string;
  privacy_version: string;
  source_page: string;
  email_normalized: string | null;
  duplicate_count: number;
  review_status: string;
  admin_notes: string | null;
};

export type EntryPage = {
  items: EntryRow[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 200;

export async function listEntries(options: {
  page: number;
  pageSize?: number;
  sort: EntrySort;
  filters: EntryFilters;
}): Promise<EntryPage> {
  const pageSize = Math.min(Math.max(1, options.pageSize ?? DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const page = Math.max(1, options.page);

  const sb = supabaseAdmin.from("giveaway_entries");

  // Start from a clean select of all columns the admin UI may display.
  let query = sb.select("*").order(options.sort.field, {
    ascending: options.sort.dir === "asc",
  });

  // Apply filters.
  const filter: string[] = [];
  if (options.filters.search && options.filters.search.trim()) {
    const term = options.filters.search.trim();
    filter.push(
      `(full_name.ilike.%${term}% or business_name.ilike.%${term}% or email.ilike.%${term}%)`,
    );
  }
  if (options.filters.reviewStatus && options.filters.reviewStatus !== "all") {
    filter.push(`review_status.eq.${options.filters.reviewStatus}`);
  }
  if (options.filters.usState) {
    filter.push(`us_state.eq.${options.filters.usState}`);
  }
  if (options.filters.businessStage) {
    filter.push(`business_stage.eq.${options.filters.businessStage}`);
  }
  if (options.filters.marketingConsent && options.filters.marketingConsent !== "any") {
    if (options.filters.marketingConsent === "yes") {
      filter.push(`marketing_consent.eq.true`);
    } else if (options.filters.marketingConsent === "no") {
      filter.push(`marketing_consent.eq.false`);
    }
  }
  if (options.filters.fromDate) {
    filter.push(`created_at.gte.${options.filters.fromDate}`);
  }
  if (options.filters.toDate) {
    filter.push(`created_at.lte.${options.filters.toDate}`);
  }

  if (filter.length > 0) {
    query = query.or(filter.join(","));
  }

  const rows = await query
    .range((page - 1) * pageSize, page * pageSize - 1)
    .limit(pageSize)
    .select("*");

  const items: EntryRow[] = Array.isArray(rows) ? rows : [];
  const total = Array.isArray(rows) ? rows.length : 0;

  return {
    items,
    total,
    page,
    pageSize,
    pages: total > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1,
  };
}

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

export async function getEntry(id: string): Promise<EntryRow | null> {
  const { data, error } = await supabaseAdmin
    .from("giveaway_entries")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as EntryRow;
}

// ---------------------------------------------------------------------------
// Updates — review status and admin notes
// ---------------------------------------------------------------------------

export type EntryUpdateInput = {
  reviewStatus?: (typeof REVIEW_STATUSES)[number];
  adminNotes?: string;
};

export type EntryUpdateRow = {
  id: string;
  review_status: string;
  admin_notes: string | null;
};

export type EntryUpdateResult = { ok: true; entry: EntryUpdateRow } | { ok: false; error: string };

export async function updateEntry(id: string, input: EntryUpdateInput): Promise<EntryUpdateResult> {
  const updates: EntryUpdateRow = {
    id,
    review_status: "",
    admin_notes: "",
  };

  let changed = false;

  if (input.reviewStatus !== undefined) {
    updates.review_status = input.reviewStatus;
    changed = true;
  }

  if (input.adminNotes !== undefined) {
    updates.admin_notes = input.adminNotes;
    changed = true;
  }

  if (!changed) {
    return { ok: false, error: "No changes" };
  }

  const { data, error } = await supabaseAdmin
    .from("giveaway_entries")
    .update({
      review_status: updates.review_status,
      admin_notes: updates.admin_notes,
    })
    .eq("id", id)
    .select("id, review_status, admin_notes")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not update entry" };
  }

  return {
    ok: true,
    entry: {
      id: data.id as string,
      review_status: data.review_status as string,
      admin_notes: (data.admin_notes as string | null) ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// RLS notes for a future admin RLS model
// ---------------------------------------------------------------------------
//
// If admin access should go through RLS instead of the service-role client,
// the project must add admin policies that satisfy the task's UPDATE
// requirements:
//
// 1. An UPDATE policy requires a matching SELECT policy, otherwise updates
//    silently affect 0 rows.
// 2. An UPDATE policy must include both USING and WITH CHECK.
//
// A reviewed admin predicate should never use editable user_metadata. Use
// app_metadata, a dedicated admin flag, or an allowlist table — whichever the
// project approves. Example shape only:
//
//   -- Admin SELECT (required before UPDATE can target rows)
//   CREATE POLICY "Admins can view entries"
//     ON public.giveaway_entries FOR SELECT
//     TO authenticated
//     USING ( is_admin() );
//
//   -- Admin UPDATE with USING + WITH CHECK
//   CREATE POLICY "Admins can update entries"
//     ON public.giveaway_entries FOR UPDATE
//     TO authenticated
//     USING ( is_admin() )
//     WITH CHECK ( is_admin() );
//
// Until those policies exist and are verified, admin reads/updates here use
// the service-role client, which bypasses RLS. That is acceptable for a
// back-office tool running in a trusted server environment, but it should be
// replaced with RLS-based admin policies before production launch.
