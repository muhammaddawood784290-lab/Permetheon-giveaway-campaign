# Security and Row-Level Security

Status: Draft

## Rules

- Never commit service-role keys.
- Keep .env local and excluded from Git.
- Public users may insert valid entries only.
- Public users may not select, update, or delete entries.
- Admin reads and writes require authenticated admin authorization.
- Validate all public input on the server.
- Do not trust client-supplied review status, notes, duplicate count, or consent versions.
- Log operational failures without logging full entrant records.

## Before launch

- Confirm RLS is enabled.
- Confirm the anonymous role cannot read entries.
- Confirm a normal authenticated user cannot read entries unless explicitly authorized.
- Confirm admin authorization is tested with both allowed and denied accounts.
- Rotate any key that was accidentally exposed.

