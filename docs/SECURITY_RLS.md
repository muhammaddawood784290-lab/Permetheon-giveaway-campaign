# Security and Row-Level Security

Status: Partially implemented — database verified on the reachable Supabase project; Edge Function rewritten for the Supabase Edge Runtime but not yet deployed from this workspace.

## Verified database state (reachable Supabase project)

On the reachable Supabase project used for verification (`aznldzafansjgfcxnntj`, "permetheon campaign"):

- `public.giveaway_entries` exists with all expected columns and defaults.
- CHECK constraints are active for name/business/email/state/goal/description lengths, business_stage enum, review_status enum, `rules_privacy_consent = true`, and website_url length.
- `before_insert` trigger exists and is enabled.
- Trigger behavior verified: `email_normalized` is lowercased/trimmed, `review_status` is set to `pending`, `admin_notes` is cleared, `duplicate_count` is computed, and `created_at` is set to now.
- Indexes exist: `giveaway_entries_email_idx` on `email_normalized`, `giveaway_entries_created_idx` on `created_at DESC`, and the PK index.
- RLS is enabled.
- Only one RLS policy exists: `Public can submit entries` (INSERT), with `WITH CHECK ((rules_privacy_consent = true) AND (review_status = 'pending') AND (admin_notes IS NULL))`.

## Public Data API access

On the reachable project, `public.giveaway_entries` is exposed through the Data API (OpenAPI includes GET/POST/PATCH/DELETE), and the `public` schema still applies broad default table grants. Therefore reachability and RLS both matter:

- Anonymous users can reach the table through the REST API.
- Anonymous INSERT is allowed only when the INSERT policy's `WITH CHECK` passes.
- Anonymous SELECT/UPDATE/DELETE have no matching RLS policy, so they are denied by RLS.

This satisfies the public access requirement:

- Anonymous users can INSERT valid entries only.
- Anonymous users cannot SELECT entries.
- Anonymous users cannot UPDATE entries.
- Anonymous users cannot DELETE entries.

Note: this verification was performed analytically plus with a service-role-backed cleanup path. A live anonymous REST call was not made from this workspace because the project's anon key was not stored here.

## Edge Function security

The public `submit-giveaway` Edge Function:

- Is deployed as a public Supabase Edge Function (`auth: 'none'`, `verify_jwt = false`).
- Validates all input server-side with Zod.
- Enforces honeypot and fast-submit protection silently.
- Inserts only approved fields with the service-role key from env.
- Never trusts client-supplied review status, notes, duplicate count, normalized email, or consent versions.
- Returns generic public error messages.
- Restricts CORS to the production campaign origin plus local dev origins.

## Rules

- Never commit service-role keys.
- Keep .env local and excluded from Git.
- Public users may insert valid entries only.
- Public users may not select, update, or delete entries.
- Admin reads and writes require authenticated admin authorization.
- Validate all public input on the server.
- Do not trust client-supplied review status, notes, duplicate count, or consent versions.
- Log operational failures without logging full entrant records.

## Before launch

- Confirm RLS is enabled.
- Confirm the anonymous role cannot read entries.
- Confirm a normal authenticated user cannot read entries unless explicitly authorized.
- Confirm admin authorization is tested with both allowed and denied accounts.
- Rotate any key that was accidentally exposed.

