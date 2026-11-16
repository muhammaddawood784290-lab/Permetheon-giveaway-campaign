# Supabase CLI: Local Link and Deploy (Permetheon Giveaway Campaign)

This document describes the **local, manual** workflow for linking the
Supabase CLI to the approved campaign project and deploying the
`submit-giveaway` Edge Function. It is intended for a developer working
on their own machine or a provisioned workspace that has its own
authentication. **This repository does not store, commit, or transmit
any Supabase tokens, passwords, service-role keys, or `.env` files.**

## Approved target

- Organization: **Permetheon Campaigns**
- Organization ID: `eznywytjkkmueahsghan`
- Project name: **permetheon campaign**
- Project ref: `aznldzafansjgfcxnntj`

The Supabase CLI **links to the project ref**, not to the organization.
The organization is used for access/verification context only. You link
and deploy against the project ref `aznldzafansjgfcxnntj`.

## Repository files involved

- `supabase/config.toml` — project configuration. Currently contains:
  - `project_id = "aznldzafansjgfcxnntj"`
  - `[functions.submit-giveaway]` with `verify_jwt = false`
- `supabase/functions/submit-giveaway/index.ts` — Edge Function source
  (Supabase Edge Runtime / Deno-compatible).
- `supabase/functions/submit-giveaway/deno.json` — Deno runtime config
  for the function.
- `supabase/functions/submit-giveaway/package.json` — function package
  metadata (`"type": "module"`).

Do not edit the database schema in `supabase/migrations/` or `drizzle/`
by hand. Schema changes belong to the project’s schema tooling, not to
this manual deploy document.

## Prerequisites

- Node.js 20 or later.
- The Supabase CLI installed in the environment. In this repository it is
  a dev dependency and can be run as `npx supabase <command>`.
- A Supabase account that has access to project `aznldzafansjgfcxnntj`,
  authenticated locally with `npx supabase login`.

## Safe local workflow

### 1. Install dependencies

If dependencies are not already installed:

```bash
npm install
```

This installs the Supabase CLI via the project dev dependency along with
the rest of the project’s dependencies. It updates `package-lock.json`.
Do not commit `.env`, service-role keys, or any secrets.

### 2. Authenticate the Supabase CLI locally

```bash
npx supabase login
```

Follow the interactive browser prompt. This stores a local CLI session
for the authenticated Supabase account. Do not paste tokens, service-role
keys, or passwords into the terminal or into the repository.

If the environment supports non-interactive authentication through a
supported provider, use the CLI’s documented non-interactive login flow
instead. Never commit the resulting credentials.

### 3. Link the CLI to the approved project

```bash
npx supabase link --project-ref aznldzafansjgfcxnntj
```

This points the local repository at project `aznldzafansjgfcxnntj`. The
organization **Permetheon Campaigns** (`eznywytjkkmueahsghan`) is the
owning/access context for the project; the link target is the project
ref, not the organization.

### 4. Verify the link

```bash
npx supabase status
```

Confirm that the output shows the linked project `aznldzafansjgfcxnntj`
and that the local `supabase/config.toml` project matches the intended
project ref.

### 5. Inspect the project’s migrations and schema

Before deploying, confirm the local migration set and the remote schema
are consistent for the giveaway table:

```bash
# Inspect local migration status
npx drizzle-kit status

# Or inspect migrations directly
ls -la supabase/migrations/
```

Verify that `public.giveaway_entries` exists remotely and that its
column names match the function source. In particular, the function
insert payload must use the live column name `rules_privacy_consent`.

Do not rename or alter the live database column or the RLS policy during
deploy. The function and config must match the existing live schema and
RLS policy.

### 6. Verify RLS and the function configuration

Confirm the remote state matches the intended configuration:

- Table `public.giveaway_entries` exists.
- The anonymous INSERT policy exists and is unchanged.
- Edge Function `submit-giveaway` exists with `verify_jwt = false`.

These are verification/audit steps, not deploy steps.

### 7. Deploy the function

```bash
npx supabase functions deploy submit-giveaway
```

This bundles and deploys `supabase/functions/submit-giveaway` to project
`aznldzafansjgfcxnntj`. After deploy, confirm the function configuration
shows `verify_jwt = false`.

### 8. Run a safe anonymous end-to-end test

Once the function is deployed and invocable, submit one safe anonymous
test entry with:

- a disposable test email,
- valid form values,
- `rulesConsent: true`,
- an empty honeypot field,
- and a `startedAt` timestamp old enough to pass the fast-submit guard.

Then verify the row appears in `public.giveaway_entries`, confirm only the
expected fields were inserted, and delete the test row afterward.

Never use real entrant data for a test submission.

### 9. Clean up the test row

After the test, delete the test row from `public.giveaway_entries` so no
test data remains in the production table.

## What this repository does not contain

- No Supabase service-role key.
- No Supabase anon/publishable key committed in source.
- No `.env` files committed (the `.gitignore` excludes `.env` and
  `.env.*`, while keeping `.env.example` if present).
- No tokens, passwords, or credentials of any kind.
- No build output (`.output/`, `dist/`, `build/`) or Wrangler cache
  (`.wrangler/`) committed (these are excluded by `.gitignore`).

## Local-only note

This workflow is performed locally by a developer or provisioned
workspace with its own authentication. The repository itself does not
authenticate, link, or deploy on behalf of any user, and it does not
store the credentials needed to do so.
