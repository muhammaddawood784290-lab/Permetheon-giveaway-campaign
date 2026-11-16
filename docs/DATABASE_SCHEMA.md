# Database Schema

Status: Ready for implementation; migration still needs to be applied and verified in the intended Supabase project.

## Table: public.giveaway_entries

- id — UUID primary key.
- created_at — submission timestamp.
- full_name — required entrant name.
- business_name — required business or project name.
- email — submitted email.
- us_state — eligible US state.
- business_stage — controlled stage value.
- primary_goal — required goal.
- project_description — required description.
- website_url — optional URL.
- services_of_interest — text array.
- rules_privacy_consent — must be true.
- marketing_consent — optional boolean.
- rules_version — rules version accepted.
- privacy_version — privacy version accepted.
- source_page — source route.
- email_normalized — normalized duplicate key.
- duplicate_count — duplicate indicator.
- review_status — review workflow state.
- admin_notes — internal notes.

The source migration is in drizzle/migrations/0000_migration.sql. Apply it only after reviewing it against the production Supabase project.

