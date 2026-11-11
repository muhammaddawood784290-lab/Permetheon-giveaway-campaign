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

## Admin variables (server-side only)

SUPABASE_SERVICE_ROLE_KEY=
ADMIN_ALLOWLIST=

Service-role keys must exist only in trusted server-side configuration (the Supabase
Edge Function and any admin Edge Functions) and must never be exposed to browser code.

## Local development

For local development with `npm run dev`, set the variables in a local `.env` file
which is gitignored. During local development you may also expose them via
`window.__SUPABASE_URL` and `window.__SUPABASE_EDGE_FUNCTION_URL` if the build
needs them at runtime.

Maintain separate values for local development, staging, and Hostinger production.
