# Backend API Specification

Status: Partially implemented

## Public operation — Supabase Edge Function

The public form submission now goes directly from the browser to a Supabase Edge Function,
because the Hostinger deployment target is static-only and cannot run TanStack Start server
functions. The Edge Function performs server-side validation, spam protection, and database
insertion using the Supabase service-role key.

Edge function path: `supabase/functions/submit-giveaway/index.ts`

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

1. Validate the payload server-side with the same Zod schema used on the client.
2. Silently accept (return 200 OK) if the honeypot is filled or the submission is
   implausibly fast (under 3 seconds). This avoids revealing the protection to spammers.
3. Insert only approved fields into `giveaway_entries`.
4. Set consent and version fields from server-controlled values (`RULES_VERSION`,
   `PRIVACY_VERSION`).
5. Set `source_page` to `/giveaway`.
6. Return `{ ok: true }` on success.
7. Return a generic error message on failure without exposing database details.

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
