import { createFileRoute } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useRouter, useLocation } from "@tanstack/react-router";
import { adminListEntries } from "@/lib/admin/functions/entries";
import {
  REVIEW_STATUSES,
  BUSINESS_STAGES,
  US_STATES,
  type EntryPage,
  type EntryRow,
  type EntrySort,
} from "@/lib/admin/entries.server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type PageParams = {
  page: number;
  pageSize: number;
  sortField: EntrySort["field"];
  sortDir: "asc" | "desc";
  search: string | undefined;
  reviewStatus: string;
  usState: string | undefined;
  businessStage: string | undefined;
  marketingConsent: "any" | "yes" | "no";
};

const getEntries = createServerFn({ method: "GET" })
  .validator((data: PageParams) => data)
  .handler(async (ctx) => {
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
    } = ctx.data;
    return adminListEntries({
      data: {
        page,
        pageSize,
        sortField,
        sortDir,
        reviewStatus,
        marketingConsent,
        ...(search !== undefined && { search }),
        ...(usState !== undefined && { usState }),
        ...(businessStage !== undefined && { businessStage }),
      },
    });
  });

const REVIEW_BADGE_CLASS: Record<string, string> = {
  pending: "border-border bg-muted text-muted-foreground",
  valid: "border-green-500/40 bg-green-500/10 text-green-300",
  invalid: "border-red-500/40 bg-red-500/10 text-red-300",
  duplicate: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  finalist: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  winner: "border-foreground bg-foreground text-background",
};

function statusBadge(status: string) {
  return (
    <Badge className={REVIEW_BADGE_CLASS[status] ?? "border-border bg-muted text-muted-foreground"}>
      {status}
    </Badge>
  );
}

function EntryRowCard({ row, onView }: { row: EntryRow; onView: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onView(row.id)}
      className="w-full text-left border-border bg-card p-4 transition hover:bg-muted sm:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-foreground">{row.full_name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{row.business_name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{row.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge(row.review_status)}
          {row.duplicate_count > 0 ? (
            <Badge variant="outline" className="border-border text-muted-foreground">
              {row.duplicate_count} dup
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>{row.us_state}</span>
        <span>·</span>
        <span>{row.business_stage}</span>
        <span>·</span>
        <span>{row.created_at.slice(0, 10)}</span>
      </div>
      {row.admin_notes ? (
        <p className="mt-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Note:</span> {row.admin_notes}
        </p>
      ) : null}
    </button>
  );
}

function PageControls({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  const pagesAround = useMemo(() => {
    const start = Math.max(1, page - 2);
    const end = Math.min(pages, page + 2);
    return Array.from({ length: end - start + 1 }, (_i, i) => start + i);
  }, [page, pages]);

  return (
    <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
      <p className="text-muted-foreground">
        Page {page} of {pages}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        {pagesAround.map((p) => (
          <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            size="sm"
            onClick={() => onPage(p)}
          >
            {p}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function Filters({
  values,
  onChange,
}: {
  values: PageParams;
  onChange: (values: PageParams) => void;
}) {
  return (
    <div className="flex flex-wrap gap-4 border-border bg-card p-4 sm:p-5">
      <div className="flex-1 min-w-[160px]">
        <Label className="text-xs">Search</Label>
        <Input
          value={values.search ?? ""}
          placeholder="Name, business, or email"
          onChange={(e) => onChange({ ...values, search: e.target.value })}
        />
      </div>
      <div className="w-40">
        <Label className="text-xs">Status</Label>
        <select
          className="mt-1.5 w-full rounded-sm border border-input bg-card px-3 py-2 text-sm"
          value={values.reviewStatus ?? "all"}
          onChange={(e) => onChange({ ...values, reviewStatus: e.target.value })}
        >
          <option value="all">All statuses</option>
          {REVIEW_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="w-40">
        <Label className="text-xs">State</Label>
        <select
          className="mt-1.5 w-full rounded-sm border border-input bg-card px-3 py-2 text-sm"
          value={values.usState ?? ""}
          onChange={(e) => onChange({ ...values, usState: e.target.value })}
        >
          <option value="">All states</option>
          {US_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="w-40">
        <Label className="text-xs">Stage</Label>
        <select
          className="mt-1.5 w-full rounded-sm border border-input bg-card px-3 py-2 text-sm"
          value={values.businessStage ?? ""}
          onChange={(e) => onChange({ ...values, businessStage: e.target.value })}
        >
          <option value="">All stages</option>
          {BUSINESS_STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="w-36">
        <Label className="text-xs">Marketing consent</Label>
        <select
          className="mt-1.5 w-full rounded-sm border border-input bg-card px-3 py-2 text-sm"
          value={values.marketingConsent ?? "any"}
          onChange={(e) =>
            onChange({ ...values, marketingConsent: e.target.value as "any" | "yes" | "no" })
          }
        >
          <option value="any">Any</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() =>
            onChange({
              page: 1,
              pageSize: values.pageSize,
              sortField: values.sortField,
              sortDir: values.sortDir,
              search: undefined,
              reviewStatus: "all",
              usState: undefined,
              businessStage: undefined,
              marketingConsent: "any",
            })
          }
        >
          Clear
        </Button>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin/entries")({
  component: EntriesPage,
});

function EntriesPage() {
  const router = useRouter();
  const location = useLocation();
  const getEntriesFn = useServerFn(getEntries);

  const params = useMemo<PageParams>(() => {
    const url = new URL(location.href);
    return {
      page: Math.max(1, Number(url.searchParams.get("page") ?? "1")),
      pageSize: Math.min(200, Math.max(1, Number(url.searchParams.get("pageSize") ?? "25"))),
      sortField: (url.searchParams.get("sortField") as EntrySort["field"]) ?? "created_at",
      sortDir: url.searchParams.get("sortDir") === "asc" ? "asc" : "desc",
      search: url.searchParams.get("search") ?? undefined,
      reviewStatus: url.searchParams.get("reviewStatus") ?? "all",
      usState: url.searchParams.get("usState") ?? undefined,
      businessStage: url.searchParams.get("businessStage") ?? undefined,
      marketingConsent:
        (url.searchParams.get("marketingConsent") as "any" | "yes" | "no" | null) ?? "any",
    };
  }, [location.href]);

  type PageParamsRuntime = typeof params;

  const [data, setData] = useState<EntryPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (p: number, useCurrentParams: boolean = true) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getEntriesFn({
        data: {
          page: p,
          pageSize: params.pageSize,
          sortField: params.sortField,
          sortDir: params.sortDir,
          search: useCurrentParams ? params.search : undefined,
          reviewStatus: params.reviewStatus,
          usState: useCurrentParams ? params.usState : undefined,
          businessStage: useCurrentParams ? params.businessStage : undefined,
          marketingConsent: params.marketingConsent,
        },
      });
      setData(result);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Could not load entries");
    } finally {
      setLoading(false);
    }
  };

  if (data === null && !loading && !error) {
    load(params.page);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Entries</h2>
        <a
          href={`/admin/entries/csv?page=${params.page}&pageSize=${params.pageSize}&sortField=${params.sortField}&sortDir=${params.sortDir}&reviewStatus=${params.reviewStatus}&usState=${params.usState ?? ""}&businessStage=${params.businessStage ?? ""}&marketingConsent=${params.marketingConsent}`}
          className="inline-flex items-center justify-center rounded-sm border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Export CSV
        </a>
      </div>

      <Filters
        values={params}
        onChange={(next) => {
          load(next.page, false);
        }}
      />

      <div className="flex items-center gap-3 border-border bg-card p-4">
        <Label className="text-xs">Sort by</Label>
        <select
          className="rounded-sm border-input bg-card px-3 py-2 text-sm flex-1"
          value={params.sortField}
          onChange={(e) => load(params.page)}
        >
          <option value="created_at">Date submitted</option>
          <option value="full_name">Name</option>
          <option value="email">Email</option>
          <option value="business_name">Business</option>
          <option value="review_status">Status</option>
          <option value="duplicate_count">Duplicates</option>
        </select>
        <Button variant="outline" size="sm" onClick={() => load(params.page)}>
          {params.sortDir === "asc" ? "Ascending" : "Descending"}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-sm text-muted-foreground">
          Loading entries…
        </div>
      ) : error ? (
        <div className="rounded-sm border border-foreground bg-card p-5 text-sm">
          <p className="font-medium">Could not load entries.</p>
          <p className="mt-1 text-muted-foreground">{error}</p>
        </div>
      ) : data && data.items.length === 0 ? (
        <div className="rounded-sm border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No entries match the current filters.
        </div>
      ) : data ? (
        <>
          <div className="space-y-3">
            {data.items.map((row) => (
              <EntryRowCard
                key={row.id}
                row={row}
                onView={(id) => router.navigate({ to: "/admin/entries/$id", params: { id } })}
              />
            ))}
          </div>
          <PageControls page={data.page} pages={data.pages} onPage={(p) => load(p)} />
        </>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Showing {data?.total ?? 0} entries. Admins may only view and update entries they are
        authorized to access.
      </p>
    </div>
  );
}
