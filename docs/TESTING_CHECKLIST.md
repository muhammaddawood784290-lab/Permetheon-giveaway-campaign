# Testing Checklist

Status: Draft

## Public page

- [ ] Root route redirects to the giveaway page.
- [ ] Hero CTAs scroll to the intended sections.
- [ ] Layout works on mobile without horizontal scrolling.
- [ ] Navigation and footer links work.
- [ ] Placeholder campaign values are replaced.

## Form

- [ ] Empty required fields show clear errors.
- [ ] Invalid email and URL values are rejected.
- [ ] Only allowed US states and business stages are accepted.
- [ ] Rules and privacy consent is required.
- [ ] Marketing consent is optional.
- [ ] Honeypot and fast-submit checks work.
- [ ] Successful submission shows the thank-you state.
- [ ] Database failures show a generic error.

## Admin

- [ ] Unauthenticated users cannot access admin routes.
- [ ] Authorized admins can search and filter entries.
- [ ] Status and notes updates are protected.
- [ ] CSV export does not expose unauthorized data.

## Launch

- [ ] Supabase migration applied.
- [ ] RLS tested.
- [ ] Hostinger production environment variables configured.
- [ ] HTTPS and domain verified.
- [ ] No secrets appear in build output.

