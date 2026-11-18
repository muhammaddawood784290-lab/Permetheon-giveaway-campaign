import { createFileRoute } from "@tanstack/react-router";
import { parseEntryListQuery, toEntryFilters } from "@/lib/admin/query-params";

/**
 * CSV export for the current entry filters.
 *
 * Implemented as a route GET handler so the browser receives real
 * `text/csv` + `Content-Disposition: attachment` headers. Authorization is the
 * same admin session check used by the admin server functions.
 */
export const Route = createFileRoute("/admin/entries/csv")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { readAdminSession } = await import("@/lib/admin/auth.server");

        const session = await readAdminSession();
        if (!session.authorized) {
          return new Response("Unauthorized", {
            status: 401,
            headers: { "Cache-Control": "no-store" },
          });
        }

        const query = parseEntryListQuery(new URL(request.url));

        const { listEntryRowsExport } = await import("@/lib/admin/csv.server");
        const { buildEntriesCsv, csvDownloadHeaders } = await import("@/lib/admin/csv.server");

        const rows = await listEntryRowsExport(toEntryFilters(query), query.sort);

        const today = new Date().toISOString().slice(0, 10);
        return new Response(buildEntriesCsv(rows), {
          status: 200,
          headers: csvDownloadHeaders(`permetheon-giveaway-entries-${today}.csv`),
        });
      },
    },
  },
});
