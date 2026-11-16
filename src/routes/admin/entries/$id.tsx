import { createFileRoute } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { useRouter, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { adminGetEntry, adminUpdateEntry } from "@/lib/admin/functions/entries";
import { REVIEW_STATUSES, type EntryRow, type EntryUpdateResult } from "@/lib/admin/entries.server";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const getEntry = createServerFn({ method: "GET" })
  .validator((data: { id: string }) => data)
  .handler(async (ctx) => {
    const { id } = ctx.data;
    const entry = await adminGetEntry({ data: { id } });
    if (!entry) {
      throw new Error("Entry not found");
    }
    return entry;
  });

const updateEntry = createServerFn({ method: "POST" })
  .validator(
    (data: { id: string; reviewStatus?: (typeof REVIEW_STATUSES)[number]; adminNotes?: string }) =>
      data,
  )
  .handler(async (ctx) => {
    const { id, reviewStatus, adminNotes } = ctx.data;
    return adminUpdateEntry({
      data: {
        id,
        ...(reviewStatus !== undefined && { reviewStatus }),
        ...(adminNotes !== undefined && { adminNotes }),
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

function StatusPills({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {REVIEW_STATUSES.map((s) => (
        <Button
          key={s}
          variant={value === s ? "default" : "outline"}
          size="sm"
          type="button"
          onClick={() => onChange(s)}
        >
          {s}
        </Button>
      ))}
    </div>
  );
}

export const Route = createFileRoute("/admin/entries/$id")({
  component: EntryDetailPage,
});

function EntryDetailPage() {
  const router = useRouter();
  const { id } = useParams({ from: "/admin/entries/$id" }) as { id: string };
  const getEntryFn = useServerFn(getEntry);
  const updateEntryFn = useServerFn(updateEntry);

  const [entry, setEntry] = useState<EntryRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const row = await getEntryFn({ data: { id } });
      if (!row) {
        setError("Entry not found");
        return;
      }
      setEntry(row);
      setNotes(row.admin_notes ?? "");
      setStatus(row.review_status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load entry");
    } finally {
      setLoading(false);
    }
  };

  if (!entry && !loading && !error) {
    load();
  }

  const save = async () => {
    if (!entry) return;
    setSaving(true);
    setError(null);
    try {
      const result = await updateEntryFn({
        data: {
          id,
          reviewStatus: status as (typeof REVIEW_STATUSES)[number],
          adminNotes: notes,
        },
      });
      setEntry((prev) =>
        prev
          ? { ...prev, review_status: result.review_status, admin_notes: result.admin_notes }
          : prev,
      );
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Entry detail</h2>
        <Button variant="ghost" size="sm" onClick={() => router.navigate({ to: "/admin/entries" })}>
          Back to entries
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-sm text-muted-foreground">
          Loading entry…
        </div>
      ) : error ? (
        <div className="rounded-sm border border-foreground bg-card p-5 text-sm">
          <p className="font-medium">Could not load entry.</p>
          <p className="mt-1 text-muted-foreground">{error}</p>
        </div>
      ) : entry ? (
        <div className="space-y-6 border-border bg-card p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-medium">{entry.full_name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{entry.business_name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{entry.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {statusBadge(entry.review_status)}
              {entry.duplicate_count > 0 ? (
                <Badge variant="outline" className="border-border text-muted-foreground">
                  {entry.duplicate_count} prior entries with this email
                </Badge>
              ) : null}
            </div>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Submitted</dt>
              <dd className="mt-1 text-foreground">
                {entry.created_at.slice(0, 19).replace("T", " ")}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">State</dt>
              <dd className="mt-1 text-foreground">{entry.us_state}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Business stage</dt>
              <dd className="mt-1 text-foreground">{entry.business_stage}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Source page</dt>
              <dd className="mt-1 text-foreground">{entry.source_page}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Rules version</dt>
              <dd className="mt-1 text-foreground">{entry.rules_version}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Privacy version</dt>
              <dd className="mt-1 text-foreground">{entry.privacy_version}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Marketing consent</dt>
              <dd className="mt-1 text-foreground">{entry.marketing_consent ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Normalized email</dt>
              <dd className="mt-1 text-foreground">{entry.email_normalized ?? "—"}</dd>
            </div>
          </dl>

          <div>
            <h3 className="text-base font-semibold">Primary goal</h3>
            <p className="mt-1 text-sm text-muted-foreground">{entry.primary_goal}</p>
          </div>

          <div>
            <h3 className="text-base font-semibold">Project description</h3>
            <p className="mt-1 text-sm text-muted-foreground">{entry.project_description}</p>
          </div>

          {entry.website_url ? (
            <div>
              <h3 className="text-base font-semibold">Current website URL</h3>
              <p className="mt-1 text-sm text-muted-foreground">{entry.website_url}</p>
            </div>
          ) : null}

          {entry.services_of_interest && entry.services_of_interest.length > 0 ? (
            <div>
              <h3 className="text-base font-semibold">Services of interest</h3>
              <div className="mt-1 flex flex-wrap gap-2">
                {entry.services_of_interest.map((s) => (
                  <Badge key={s} variant="outline" className="border-border">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          <div className="border-t border-border pt-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Review status</Label>
              <StatusPills value={status} onChange={setStatus} />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Private admin notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes visible only to authorized admins."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                These notes are private and are not shown to entrants or the public.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={save}
                disabled={saving || (status === entry.review_status && notes === entry.admin_notes)}
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
              {saved ? <span className="text-sm text-muted-foreground">Saved.</span> : null}
            </div>

            {error ? <p className="text-sm text-foreground">{error}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
