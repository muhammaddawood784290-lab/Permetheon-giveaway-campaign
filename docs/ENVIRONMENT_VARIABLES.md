# Environment Variables

Status: Updated — Edge Function deployment

Never publish real values in this document or commit them to Git.

## Required client-side variables

These are available to the browser build and used by the public form submission
via the Supabase Edge Function.

SUPABASE_URL=
SUPABASE_EDGE_FUNCTION_URL=

SUPABASE_EDGE_FUNCTION_URL is the full URL of the deployed Edge Function, for example:
https://uvrcqzprhofotirzadso.supabase.co/functions/v1/submit-giveaway

The public submit-giveaway function is a Supabase Edge Function deployed with auth mode "none" and verify_jwt = false. Browser code calls it with the project's publishable key on the `apikey` header. The service-role key is used only inside the function.

## Admin variables (server-side only)

SUPABASE_SERVICE_ROLE_KEY=
ADMIN_ALLOWLIST=

The submit-giveaway Edge Function reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the Supabase project secret store (Deno.env.get). Those secrets live in the Supabase project only and are never committed or exposed to browser code.

The public Edge Function is invoked with the project's publishable key from the browser; the service-role key is used only server-side for the database insert.

Admin variables (server-side only):
- SUPABASE_SERVICE_ROLE_KEY — for admin Edge Functions / server-side admin code only
- ADMIN_ALLOWLIST — approved admin identities for authorization (preferred over app_metadata where used)

## Local development

For local development with `npm run dev`, set the variables in a local `.env` file
which is gitignored. During local development you may also expose them via
`window.__SUPABASE_URL` and `window.__SUPABASE_EDGE_FUNCTION_URL` if the build
needs them at runtime.

Maintain separate values for local development, staging, and Hostinger production.
