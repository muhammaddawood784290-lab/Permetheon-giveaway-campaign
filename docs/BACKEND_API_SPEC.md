# Backend API Specification

Status: Partially implemented

## Public operation — Supabase Edge Function

The public form submission now goes directly from the browser to a Supabase Edge Function,
because the Hostinger deployment target is static-only and cannot run TanStack Start server
functions. The Edge Function performs server-side validation, spam protection, and database
insertion using the Supabase service-role key.

Edge function path: `supabase/functions/submit-giveaway/index.ts`

Runtime: Supabase Edge Runtime (Deno-compatible). Exported as `export default { fetch: ... }`.

Auth model: public Edge Function (`auth: 'none'`, `verify_jwt = false` in `supabase/config.toml`).
The browser calls it with the project's publishable key on the `apikey` header.
The service-role key is read server-side with `Deno.env.get()` and used only for the DB insert.

CORS: restricted to the production campaign origin (`https://giveaway.permetheon.com`) plus local dev origins.

Operation name: submitGiveawayEntry

Input (sent as JSON POST body):

- Full name
- Business or project name
- Email
- US state
- Business stage
- Current website URL, optional
- Primary business goal
- Project description
- Services of interest, optional
- Rules and privacy consent (must be true)
- Marketing consent, optional
- Honeypot value (`company_website`)
- Submission start timestamp (`startedAt`)

Behavior:

1. Validate the payload server-side with Zod.
2. Silently accept (return 200 OK) if the honeypot is filled or the submission is
   implausibly fast (under 3 seconds). This avoids revealing the protection to spammers.
3. Normalize email to lowercase/trim server-side.
4. Insert only approved fields into `giveaway_entries`.
5. Set `rules_privacy_consent` to `true` from the server side.
6. Set consent and version fields from server-controlled values (`RULES_VERSION`,
   `PRIVACY_VERSION`).
7. Set `source_page` to `/giveaway`.
8. Return `{ ok: true }` on success.
9. Return a generic error message on failure without exposing database details.
10. Never store or trust client-supplied `review_status`, `admin_notes`, `duplicate_count`,
    `email_normalized`, `rules_version`, `privacy_version`, or `source_page`.

### Client-side function

File: `src/lib/giveaway.functions.ts`

The client-side `submitGiveawayEntry` function reads `SUPABASE_EDGE_FUNCTION_URL` from the
environment (or `window.__SUPABASE_EDGE_FUNCTION_URL` during development) and sends the
validated payload to the Edge Function. It also performs a client-side spam pre-check and
returns success immediately for obvious spam without making a network request.

Environment variables required:

- `SUPABASE_URL` — the Supabase project URL (also available as `window.__SUPABASE_URL`)
- `SUPABASE_EDGE_FUNCTION_URL` — the full URL to the deployed Edge Function
  (e.g. `https://uvrcqzprhofotirzadso.supabase.co/functions/v1/submit-giveaway`)

## Admin operations

To be implemented behind Supabase Auth and RLS:

- List entries with pagination and filters.
- Read one entry.
- Update review status.
- Update admin notes.
- Export authorized entries.
