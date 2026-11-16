# Permetheon Giveaway Campaign

Landing page and entry system for the Permetheon Website Giveaway Campaign.

## Planned stack

- React + TypeScript frontend
- Supabase PostgreSQL database
- Supabase Auth for the admin panel
- Hostinger deployment
- Production domain: giveaway.permetheon.com

## Project areas

- Public giveaway landing page
- Entry form with validation and consent
- Protected admin dashboard
- Entry review, duplicate/spam flags, and notes
- Campaign rules and privacy links

## Current status

The initial campaign blueprint is available in `Permetheon_US_Giveaway_Campaign_Blueprint.md`. The Lovable implementation will be added and completed in this repository.

## Important security notes

- Do not commit `.env` files or service-role keys.
- Public visitors must not be able to read giveaway entries.
- Admin data access must be protected by Supabase Auth and Row Level Security.
