import { Link, createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  type DashboardSummary,
  type EntryRow,
  type EntryFilters,
  type EntrySort,
  type EntryPage,
} from "@/lib/admin/entries.server";

import { adminGetDashboardSummary, adminListEntries } from "@/lib/admin/functions/entries";
import {
  buildEntryListSearch,
  parseEntryListQuery,
  toEntryFilters,
  type EntryListQuery,
  type ReviewStatusFilter,
} from "@/lib/admin/query-params";
import {
  BUSINESS_STAGES,
  REVIEW_STATUSES,
  US_STATES,
  type ReviewStatus,
} from "@/lib/giveaway.schema";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field-label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReviewBadge } from "@/components/admin/ui/badge";

const REVIEW_COLORS: Record<ReviewStatus, string> = {
  pending: "var(--muted-foreground)",
  valid: "hsl(130, 49%, 42%)",
  invalid: "hsl(0, 54%, 46%)",
  duplicate: "hsl(38, 94%, 50%)",
  finalist: "hsl(205, 99%, 40%)",
  winner: "hsl(262, 92%, 42%)",
};

type StatusCountKey = keyof Pick<
  DashboardSummary,
  | "pendingCount"
  | "validCount"
  | "invalidCount"
  | "duplicateCount"
  | "finalistCount"
  | "winnerCount"
>;

const STATUS_COUNT_KEYS: Record<ReviewStatus, StatusCountKey> = {
  pending: "pendingCount",
  valid: "validCount",
  invalid: "invalidCount",
  duplicate: "duplicateCount",
  finalist: "finalistCount",
  winner: "winnerCount",
};

export const Route = createFileRoute("/admin/entries/")({
  loader: async ({ location }) => {
    const query = parseEntryListQuery(
      new URL(location?.href ?? "/admin/entries", "http://localhost"),
    );
    const filters = toEntryFilters(query);

    const [list, summary] = await Promise.all([
      adminListEntries({
        page: query.page,
        pageSize: query.pageSize ?? 25,
        sort: { field: query.sort.field ?? "created_at", dir: query.sort.dir ?? "desc" },
        filters,
      }),
      adminGetDashboardSummary({ data: { filters } }),
    ]);

    const typedSummary: DashboardSummary = summary;

    return { list, summary: typedSummary, query };
  },
  component: EntriesPage,
});

function EntriesPage() {
  const { list, summary, query } = Route.useLoaderData();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="entries-title" className="text-xl font-semibold">
            Entries
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Search, filter, and paginate giveaway submissions. Counts reflect the active filters.
          </p>
        </div>
        <a
          href={`/admin/entries/csv?${buildEntryListSearch(query)}`}
          className="inline-flex items-center rounded-sm border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted"
        >
          Export CSV
        </a>
      </div>

      <div className="rounded-sm border border-border bg-muted p-5">
        <h3 className="mb-4 text-base font-semibold">Filters</h3>
        <FilterForm query={query} />
        <DashboardSummaryPanel summary={summary} />
      </div>

      <div className="rounded-sm border border-border bg-muted">
        <EntriesTable entries={list.items} query={query} />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 text-sm text-muted-foreground">
          <span>
            Showing {list.items.length} of {list.total} entries on page {query.page} of {list.pages}
            .
          </span>
          <Pagination query={query} pages={list.pages} />
        </div>
      </div>
    </div>
  );
}

function navigateWithSearch(search: string) {
  window.location.assign(`/admin/entries?${search}`);
}

function FilterForm({ query }: { query: EntryListQuery }) {
  const [search, setSearch] = useState(query.search);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatusFilter>(query.reviewStatus);
  const [usState, setUsState] = useState(query.usState);
  const [businessStage, setBusinessStage] = useState(query.businessStage);
  const [marketingConsent, setMarketingConsent] = useState(query.marketingConsent);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigateWithSearch(
      buildEntryListSearch({
        pageSize: query.pageSize,
        sort: query.sort,
        search: search.trim(),
        reviewStatus,
        usState,
        businessStage,
        marketingConsent,
      }),
    );
  };

  return (
    <form className="grid gap-x-6 gap-y-5 sm:grid-cols-2" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <FieldLabel htmlFor="filter-search">Search</FieldLabel>
        <Input
          id="filter-search"
          value={search}
          placeholder="Full name, business name, or email"
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="filter-status">Review status</FieldLabel>
        <Select
          value={reviewStatus}
          onValueChange={(value) => setReviewStatus(value as ReviewStatusFilter)}
        >
          <SelectTrigger id="filter-status">
            <SelectValue placeholder="All review statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {REVIEW_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {capitalize(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="filter-state">US state</FieldLabel>
        <Select
          value={usState || "all"}
          onValueChange={(value) => setUsState(value === "all" ? "" : value)}
        >
          <SelectTrigger id="filter-state">
            <SelectValue placeholder="All US states" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All US states</SelectItem>
            {US_STATES.map((state) => (
              <SelectItem key={state} value={state}>
                {state}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="filter-stage">Business stage</FieldLabel>
        <Select
          value={businessStage || "all"}
          onValueChange={(value) => setBusinessStage(value === "all" ? "" : value)}
        >
          <SelectTrigger id="filter-stage">
            <SelectValue placeholder="All business stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All business stages</SelectItem>
            {BUSINESS_STAGES.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {stage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="filter-consent">Marketing consent</FieldLabel>
        <Select
          value={marketingConsent}
          onValueChange={(value) =>
            setMarketingConsent(value as EntryListQuery["marketingConsent"])
          }
        >
          <SelectTrigger id="filter-consent">
            <SelectValue placeholder="Any marketing consent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="yes">Yes only</SelectItem>
            <SelectItem value="no">No only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-end gap-3 sm:col-span-2">
        <Button type="submit">Apply filters</Button>
        <a
          href="/admin/entries"
          className="inline-flex rounded-sm border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted"
        >
          Reset
        </a>
      </div>
    </form>
  );
}

function DashboardSummaryPanel({ summary }: { summary: DashboardSummary }) {
  return (
    <section aria-labelledby="dashboard-title" className="mt-8">
      <h3 id="dashboard-title" className="mb-4 text-lg font-semibold">
        Dashboard summary
      </h3>

      <dl className="grid gap-4 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard label="Total entries" value={summary.totalEntries} />
        {REVIEW_STATUSES.map((status) => (
          <StatCard
            key={status}
            label={capitalize(status)}
            value={summary[STATUS_COUNT_KEYS[status] as StatusCountKey]}
            accent={REVIEW_COLORS[status]}
          />
        ))}
      </dl>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <ChartPanel
          title="Review status"
          data={reviewStatusChartData(summary.byReviewStatus)}
          colors={reviewStatusColors(summary.byReviewStatus)}
        />
        <ChartPanel
          title="US state"
          data={categoryChartData(summary.byState)}
          colors={categoryChartData(summary.byState).map(() => "var(--muted-foreground)")}
        />
        <ChartPanel
          title="Business stage"
          data={categoryChartData(summary.byBusinessStage)}
          colors={categoryChartData(summary.byBusinessStage).map(() => "var(--muted-foreground)")}
        />
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Summary counts use the same filtered query as the entries table. If filters are active,
        totals reflect the filtered result set.
      </p>
    </section>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div
      className="rounded-sm border border-border bg-background p-4"
      style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}
    >
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">{value.toLocaleString()}</dd>
    </div>
  );
}

function reviewStatusChartData(
  rows: Record<string, EntryRow[]>,
): Array<{ label: string; count: number }> {
  return REVIEW_STATUSES.map((status) => ({
    label: capitalize(status),
    count: rows[status]?.length ?? 0,
  }));
}

function reviewStatusColors(_rows: Record<string, EntryRow[]>): string[] {
  return REVIEW_STATUSES.map((status) => REVIEW_COLORS[status]);
}

function categoryChartData(
  rows: Record<string, EntryRow[]>,
): Array<{ label: string; count: number }> {
  return Object.entries(rows)
    .map(([category, entries]) => ({ label: category, count: entries.length }))
    .sort((a, b) => b.count - a.count);
}

function categoryColors(_rows: Record<string, EntryRow[]>, colors: string[]): string[] {
  return colors;
}

type ChartDatum = { label: string; count: number };

function ChartPanel({
  title,
  data,
  colors,
}: {
  title: string;
  data: ChartDatum[];
  colors: string[];
}) {
  const hasData = data.some((row) => row.count > 0);

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">{title}</h4>
      {hasData ? (
        <DistributionChart data={data} colors={colors} />
      ) : (
        <p className="text-sm text-muted-foreground">No data yet.</p>
      )}
    </div>
  );
}

function DistributionChart({ data, colors }: { data: ChartDatum[]; colors: string[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={110}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          content={({ active, payload }) => {
            if (!active || !payload || payload.length === 0) return null;
            const point = payload[0]?.payload as ChartDatum | undefined;
            if (!point) return null;
            return (
              <div className="rounded-sm border border-border bg-background px-2 py-1 text-sm">
                <div>{point.label}</div>
                <div className="mt-1 text-muted-foreground">Count: {point.count}</div>
              </div>
            );
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((row, index) => (
            <Cell key={`cell-${row.label}`} fill={colors[index] ?? "var(--muted-foreground)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function EntriesTable({ entries, query }: { entries: EntryRow[]; query: EntryListQuery }) {
  if (entries.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-muted-foreground">No entries match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="w-full">
        <thead className="border-b border-border bg-muted/50">
          <tr>
            <SortableHeader field="full_name" label="Full name" query={query} />
            <SortableHeader field="business_name" label="Business / project" query={query} />
            <SortableHeader field="email" label="Email" query={query} />
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              US state
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Business stage
            </th>
            <SortableHeader field="created_at" label="Submitted" query={query} />
            <SortableHeader field="review_status" label="Status" query={query} />
            <SortableHeader field="duplicate_count" label="Duplicates" query={query} />
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Admin notes
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {entries.map((row) => (
            <tr key={row.id} className="hover:bg-muted/30">
              <td className="px-4 py-3">
                <Link
                  to="/admin/entries/$id"
                  params={{ id: row.id }}
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  {row.full_name}
                </Link>
              </td>
              <td className="max-w-[14rem] truncate px-4 py-3">{row.business_name}</td>
              <td className="max-w-[14rem] truncate px-4 py-3">
                {row.email_normalized ?? row.email}
              </td>
              <td className="max-w-[10rem] truncate px-4 py-3">{row.us_state}</td>
              <td className="max-w-[12rem] truncate px-4 py-3">{row.business_stage}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {new Date(row.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </td>
              <td className="px-4 py-3">
                <ReviewBadge status={row.review_status} />
              </td>
              <td className="px-4 py-3">{row.duplicate_count}</td>
              <td className="max-w-[16rem] truncate px-4 py-3 text-sm text-muted-foreground">
                {row.admin_notes ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortableHeader({
  field,
  label,
  query,
}: {
  field: EntryListQuery["sort"]["field"];
  label: string;
  query: EntryListQuery;
}) {
  const active = query.sort.field === field;
  const nextDir = active && query.sort.dir === "desc" ? "asc" : "desc";

  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      <a
        href={`/admin/entries?${buildEntryListSearch({
          ...query,
          page: 1,
          sort: { field, dir: nextDir },
        })}`}
        className="hover:text-foreground"
      >
        {label}
        {active ? (query.sort.dir === "asc" ? " ↑" : " ↓") : ""}
      </a>
    </th>
  );
}

function Pagination({ query, pages }: { query: EntryListQuery; pages: number }) {
  if (pages <= 1) return null;

  return (
    <div className="flex items-center gap-3">
      {query.page > 1 ? (
        <a
          href={`/admin/entries?${buildEntryListSearch({
            ...query,
            page: query.page - 1,
          })}`}
          className="rounded-sm border border-border px-3 py-1 text-xs hover:bg-background"
        >
          Previous
        </a>
      ) : null}
      {query.page < pages ? (
        <a
          href={`/admin/entries?${buildEntryListSearch({
            ...query,
            page: query.page + 1,
          })}`}
          className="rounded-sm border border-border px-3 py-1 text-xs hover:bg-background"
        >
          Next
        </a>
      ) : null}
    </div>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
