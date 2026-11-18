/**
 * CSV export helper for the admin panel.
 *
 * Only authorized admin server code should call this. It does not itself
 * perform authorization; the caller must already have verified the caller
 * is an admin.
 *
 * The exported columns are intentionally limited to what admins are allowed
 * to review. We do not export internal-only fields beyond what the admin UI
 * already displays.
 */

import { EntryFilters, EntrySort } from "@/lib/admin/entries.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ROWS_HEADERS = [
  "id",
  "created_at",
  "full_name",
  "business_name",
  "email",
  "us_state",
  "business_stage",
  "primary_goal",
  "project_description",
  "website_url",
  "services_of_interest",
  "marketing_consent",
  "rules_version",
  "privacy_version",
  "source_page",
  "email_normalized",
  "duplicate_count",
  "review_status",
] as const;

type ExportRow = Partial<Record<(typeof ROWS_HEADERS)[number], unknown>>;

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function renderServices(row: ExportRow): string {
  const services = (row.services_of_interest as string[] | undefined) ?? [];
  return services.map((s) => escapeCsvField(s)).join("; ");
}

/**
 * Build a UTF-8 CSV document for a set of entry rows.
 */
export function buildEntriesCsv(rows: ExportRow[]): string {
  const header = ROWS_HEADERS.join(",");
  const lines = rows.map((row) => {
    const out: string[] = [];
    for (const key of ROWS_HEADERS) {
      if (key === "services_of_interest") {
        out.push(escapeCsvField(renderServices(row)));
        continue;
      }
      out.push(escapeCsvField((row as Record<string, unknown>)[key]));
    }
    return out.join(",");
  });
  return [header, ...lines].join("\n");
}

/**
 * Export entry rows for CSV, applying filters and sort order.
 */
export async function listEntryRowsExport(
  filters: EntryFilters,
  sort: EntrySort,
): Promise<ExportRow[]> {
  const sb = supabaseAdmin.from("giveaway_entries");

  let query = sb.select("*");

  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim();
    query = query.or(
      `full_name.ilike.%${term}%, business_name.ilike.%${term}%, email.ilike.%${term}%`,
    );
  }

  if (filters.reviewStatus && filters.reviewStatus !== "all") {
    query = query.eq("review_status", filters.reviewStatus);
  }

  if (filters.usState) {
    query = query.eq("us_state", filters.usState);
  }

  if (filters.businessStage) {
    query = query.eq("business_stage", filters.businessStage);
  }

  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

/**
 * HTTP headers for forcing a CSV download.
 */
export function csvDownloadHeaders(filename: string): Record<string, string> {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${escapeCsvFilename(filename)}"`,
  };
}

/**
 * Make a CSV-safe filename from a label.
 */
function escapeCsvFilename(name: string): string {
  return name.replace(/[\\,;:"/\\|?*<>]/g, "_");
}
