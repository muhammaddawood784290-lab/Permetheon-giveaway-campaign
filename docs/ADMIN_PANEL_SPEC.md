# Admin Panel Specification

Status: Draft

## Goal

Provide a protected internal panel where authorized Permetheon staff can review giveaway entries without exposing entrant data publicly.

## Planned routes

- /admin/login
- /admin/entries
- /admin/entries/:id

## Required features

- Supabase Auth login and logout.
- Entries table with pagination.
- Search by name, business, and email.
- Filters for review status, state, business stage, consent, and date.
- Entry detail view.
- Review statuses: pending, valid, invalid, duplicate, finalist, winner.
- Admin notes.
- Duplicate count visibility.
- CSV export for authorized admins only.
- Clear empty, loading, error, and unauthorized states.

Only approved admin users may read or update entries. Public visitors must never receive an entries list or individual entry response.

