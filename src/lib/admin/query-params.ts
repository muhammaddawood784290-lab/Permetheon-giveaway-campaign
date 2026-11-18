/**
 * Parsing and building of the `/admin/entries` query string.
 *
 * Pure helpers with no server imports so the list page, the CSV export, and the
 * loaders all interpret the same URL the same way.
 */

import { z } from "zod";

export const ENTRY_SORT_FIELDS = [
  "created_at",
  "full_name",
  "email",
  "business_name",
  "review_status",
  "duplicate_count",
] as const;

export type EntrySortField = (typeof ENTRY_SORT_FIELDS)[number];
export type EntrySortDir = "asc" | "desc";
export type EntrySort = { field: EntrySortField; dir: EntrySortDir };

export type MarketingConsentFilter = "any" | "yes" | "no";
export type ReviewStatusFilter = string;

export type EntryFilters = {
  /** Free-text match against full name, business name, or email. */
  search?: string;
  /** "all" (or omitted) disables the filter. */
  reviewStatus?: ReviewStatusFilter;
  usState?: string;
  businessStage?: string;
  marketingConsent?: MarketingConsentFilter;
};

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 200;
export const DEFAULT_SORT_FIELD: EntrySortField = "created_at";
export const DEFAULT_SORT_DIR: EntrySortDir = "desc";

/**
 * Fully resolved query state, as rendered by the entries page.
 */
export type EntryListQuery = {
  page: number;
  pageSize: number;
  sort: EntrySort;
  search: string;
  reviewStatus: ReviewStatusFilter;
  usState: string;
  businessStage: string;
  marketingConsent: MarketingConsentFilter;
};

export function isEntrySortField(value: unknown): value is EntrySortField {
  return typeof value === "string" && (ENTRY_SORT_FIELDS as readonly string[]).includes(value);
}

function positiveInt(raw: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(max, parsed);
}

export function parseEntryListQuery(url: URL): EntryListQuery {
  const params = url.searchParams;

  const sortField = params.get("sortField");
  const sortDir = params.get("sortDir");
  const reviewStatus = params.get("reviewStatus");
  const marketingConsent = params.get("marketingConsent");

  const resolvedReviewStatus = reviewStatus !== null && reviewStatus !== "" ? reviewStatus : "all";

  return {
    page: positiveInt(params.get("page"), 1, Number.MAX_SAFE_INTEGER),
    pageSize: positiveInt(params.get("pageSize"), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
    sort: {
      field: isEntrySortField(sortField) ? sortField : DEFAULT_SORT_FIELD,
      dir: sortDir === "asc" ? "asc" : "desc",
    },
    search: params.get("search")?.trim() ?? "",
    reviewStatus: resolvedReviewStatus,
    usState: params.get("usState")?.trim() ?? "",
    businessStage: params.get("businessStage")?.trim() ?? "",
    marketingConsent:
      marketingConsent === "yes" || marketingConsent === "no" ? marketingConsent : "any",
  };
}

/** Translate query state into database filters, omitting empty filters. */
export function toEntryFilters(query: EntryListQuery): EntryFilters {
  return {
    ...(query.search ? { search: query.search } : {}),
    ...(query.reviewStatus !== "all" ? { reviewStatus: query.reviewStatus } : {}),
    ...(query.usState ? { usState: query.usState } : {}),
    ...(query.businessStage ? { businessStage: query.businessStage } : {}),
    ...(query.marketingConsent !== "any" ? { marketingConsent: query.marketingConsent } : {}),
  };
}

/** Build the query string for a new list state (page defaults to 1). */
export function buildEntryListSearch(
  query: Omit<EntryListQuery, "page"> & { page?: number },
): string {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize));
  params.set("sortField", query.sort.field);
  params.set("sortDir", query.sort.dir);
  if (query.search) params.set("search", query.search);
  if (query.reviewStatus !== "all") {
    params.set("reviewStatus", query.reviewStatus);
  }
  if (query.usState) params.set("usState", query.usState);
  if (query.businessStage) params.set("businessStage", query.businessStage);
  if (query.marketingConsent !== "any") {
    params.set("marketingConsent", query.marketingConsent);
  }
  return params.toString();
}
