# Hostinger Deployment

Status: Updated — Edge Function path chosen

## Target

- Host: Hostinger only.
- Public domain: giveaway.permetheon.com.
- Database: Supabase.

## Architecture decision

The app is built with TanStack Start and compiles to a Cloudflare Worker bundle
(`.output/server/index.mjs`, preset `cloudflare-module`). Hostinger's standard
shared hosting runs PHP and static files only and does **not** support Node.js
server functions or the Worker output. Vercel and Cloudflare Workers are explicitly
out of scope per the project rules.

Because of that, the public form submission was moved to a **Supabase Edge Function**
(`supabase/functions/submit-giveaway`) that the browser calls directly. The Edge
Function uses the Supabase service-role key server-side to insert entries, so the
submission path does not depend on Hostinger running any server code.

The Hostinger deployment itself is therefore a static site deployment: the built
`.output/public/` assets are served from Hostinger, and Supabase handles all dynamic
behavior (form submission, admin auth, entry storage).

## Current build output

- Client assets: `.output/public/` (JS, CSS, images, `_headers`)
- Server bundle: `.output/server/index.mjs` (Cloudflare Worker format, not used on Hostinger)

For Hostinger, only `.output/public/` is deployed. The server bundle exists so the
build still completes, but it is not served on Hostinger.

## Deployment checklist

### Pre-launch (Supabase side)

1. Apply and verify the `drizzle/migrations/0000_migration.sql` migration in the
   intended Supabase project.
2. Confirm RLS is enabled and the `anon` role can INSERT but cannot SELECT/UPDATE/DELETE.
3. Deploy the `submit-giveaway` Edge Function to the Supabase project.
4. Set `SUPABASE_URL` and `SUPABASE_EDGE_FUNCTION_URL` in the Hostinger environment
   configuration. Never commit real values.

### Hostinger side

5. Confirm the selected Hostinger plan can serve a static site on
   `giveaway.permetheon.com` with HTTPS.
6. Upload the contents of `.output/public/` to the Hostinger public folder.
7. Add production environment variables through Hostinger's private configuration so
   `SUPABASE_URL` and `SUPABASE_EDGE_FUNCTION_URL` are available to the client build.
8. Point `giveaway.permetheon.com` to Hostinger.
9. Verify HTTPS, canonical URL (`/giveaway`), robots behavior, and error pages.
10. Test the form, success state, error state, honeypot, and mobile layout.

### Admin (not on Hostinger)

Admin features (login, entries list, detail view, status updates, notes, CSV export)
are not part of the static Hostinger deployment and require a separate Supabase
Auth + Edge Function implementation. See `ADMIN_PANEL_SPEC.md`.

### Launch gate

Do not publish to production until:

- All campaign values in `src/lib/campaign-config.ts` are confirmed.
- Legal documents at `/legal/rules` and `/legal/privacy` are reviewed and live.
- `campaignReady()` returns `true`.
- Supabase migration and RLS are verified.
- Form submission is tested end-to-end through the Edge Function.
