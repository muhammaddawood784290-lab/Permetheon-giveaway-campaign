import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import {
  listEntries as listEntriesInner,
  getEntry as getEntryInner,
  updateEntry as updateEntryInner,
  type EntrySort,
} from "@/lib/admin/entries.server";
import { authenticateAdminBearerToken } from "@/lib/admin/auth.server";
import { parseAdminAllowlist, isAdmin } from "@/lib/admin/authorization";

type ListInput = {
  page: number;
  pageSize: number;
  sortField: EntrySort["field"];
  sortDir: "asc" | "desc";
  search?: string;
  reviewStatus: string;
  usState?: string;
  businessStage?: string;
  marketingConsent: "any" | "yes" | "no";
  fromDate?: string;
  toDate?: string;
};

type UpdateInput = {
  reviewStatus?: (typeof import("@/lib/admin/entries.server").REVIEW_STATUSES)[number];
  adminNotes?: string;
};

type CsvInput = {
  page: number;
  pageSize: number;
  sortField: EntrySort["field"];
  sortDir: "asc" | "desc";
  search?: string;
  reviewStatus: string;
  usState?: string;
  businessStage?: string;
  marketingConsent: "any" | "yes" | "no";
  fromDate?: string;
  toDate?: string;
};

async function requireAdmin() {
  const request = getRequest();
  if (!request?.headers) {
    throw new Error("Unauthorized");
  }
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = authHeader.slice("Bearer ".length);
  if (!token) {
    throw new Error("Unauthorized");
  }

  const { userId, email } = await authenticateAdminBearerToken(token);
  const allowlist = parseAdminAllowlist(process.env["ADMIN_ALLOWLIST"]);
  if (!isAdmin(userId, email, allowlist)) {
    throw new Error("Unauthorized");
  }
}

export const adminListEntries = createServerFn({ method: "GET" })
  .validator((data: ListInput) => data)
  .handler(async (ctx) => {
    await requireAdmin();
    const {
      page,
      pageSize,
      sortField,
      sortDir,
      search,
      reviewStatus,
      usState,
      businessStage,
      marketingConsent,
      fromDate,
      toDate,
    } = ctx.data;
    return listEntriesInner({
      page,
      pageSize,
      sort: { field: sortField, dir: sortDir },
      filters: {
        ...(search !== undefined && { search }),
        ...(usState !== undefined && { usState }),
        ...(businessStage !== undefined && { businessStage }),
        ...(fromDate !== undefined && { fromDate }),
        ...(toDate !== undefined && { toDate }),
        reviewStatus,
        marketingConsent,
      },
    });
  });

export const adminGetEntry = createServerFn({ method: "GET" })
  .validator((data: { id: string }) => data)
  .handler(async (ctx) => {
    await requireAdmin();
    const { id } = ctx.data;
    const entry = await getEntryInner(id);
    if (!entry) {
      throw new Error("Entry not found");
    }
    return entry;
  });

export const adminUpdateEntry = createServerFn({ method: "POST" })
  .validator((data: { id: string } & Partial<UpdateInput>) => data)
  .handler(async (ctx) => {
    await requireAdmin();
    const { id, reviewStatus, adminNotes } = ctx.data;
    const input: UpdateInput = {};
    if (reviewStatus !== undefined) input.reviewStatus = reviewStatus;
    if (adminNotes !== undefined) input.adminNotes = adminNotes;
    const result = await updateEntryInner(id, input);
    if (!result.ok) {
      throw new Error(result.error);
    }
    return result.entry;
  });

export const adminExportCsv = createServerFn({ method: "GET" })
  .validator((data: CsvInput) => data)
  .handler(async (ctx) => {
    await requireAdmin();
    const {
      page,
      pageSize,
      sortField,
      sortDir,
      search,
      reviewStatus,
      usState,
      businessStage,
      marketingConsent,
      fromDate,
      toDate,
    } = ctx.data;
    const pageResult = await listEntriesInner({
      page,
      pageSize: Math.min(1000, Math.max(1, pageSize)),
      sort: { field: sortField, dir: sortDir },
      filters: {
        ...(search !== undefined && { search }),
        ...(usState !== undefined && { usState }),
        ...(businessStage !== undefined && { businessStage }),
        ...(fromDate !== undefined && { fromDate }),
        ...(toDate !== undefined && { toDate }),
        reviewStatus,
        marketingConsent,
      },
    });

    const { buildEntriesCsv, csvDownloadHeaders } = await import("@/lib/admin/csv.server");
    const csv = buildEntriesCsv(pageResult.items);
    return new Response(csv, { headers: csvDownloadHeaders("permetheon-giveaway-entries.csv") });
  });
