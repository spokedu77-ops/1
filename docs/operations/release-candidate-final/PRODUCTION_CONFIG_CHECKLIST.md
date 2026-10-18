# Production config checklist

## Vercel Production (required for live service)

Configure only variables the running app needs in production:

- Supabase / auth URLs and keys (`NEXT_PUBLIC_*`, service role where applicable)
- Email, monitoring, cron secrets as already documented in `.env.example`
- Payment / SPOKEDU MASTER commercial vars where those surfaces are enabled
- **Do not** set contact E2E or QA admin variables on Production

## Local / isolated QA only (never Production)

These exist for **contact E2E and admin inbox QA** on developer machines or isolated worktrees:

| Variable | Purpose |
|----------|---------|
| `CONTACT_E2E_ALLOW_DB_WRITES` | Explicit opt-in to DB writes during E2E |
| `CONTACT_E2E_APPROVED_PROJECT_REF` | Approved Supabase project ref (manual; never derive from URL in shell) |
| `CONTACT_E2E_BLOCKED_PROJECT_REFS` | Block known production refs |
| `CONTACT_E2E_PORT` / `CONTACT_E2E_NO_SPAWN` | Runner control |
| `CONTACT_E2E_EXPECTED_BUILD_ID` | Bind QA to a specific `.next/BUILD_ID` |
| `CONTACT_E2E_ADMIN_EMAIL` | QA admin login for E15 |
| `CONTACT_E2E_ADMIN_PASSWORD` | QA admin login for E15 |

`.env.example` comments document these as **local/staging only — never production**.

## Release candidate deploy notes

- Apply `MAIN_BASE_INTEGRATION_DIFF.patch` + binary copy (see `MAIN_BASE_INTEGRATION_BINARY_APPLY.md`) on top of `c1a7ec52` or equivalent main-line ancestor.
- No new Supabase migrations are included in this package.
- SPOMOVE catalog is first-party HTML; **no** `SPOMOVE_NOTION_CATALOG_URL` required for the new catalog page.
