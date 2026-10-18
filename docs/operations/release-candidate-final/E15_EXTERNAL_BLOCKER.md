# E15 external blocker

| Field | Value |
|-------|--------|
| Gate | E15 — QA platform admin inbox verification |
| Status | **`BLOCKED_MISSING_CREDENTIALS`** |
| `CONTACT_E2E_ADMIN_EMAIL` | not configured in operator `.env.local` |
| `CONTACT_E2E_ADMIN_PASSWORD` | not configured |
| `CONTACT_E2E_ALLOW_DB_WRITES` | not configured |
| Production DB writes for E15 | **not attempted** |
| Credential guessing / bypass | **none** |

Integration packaging, patch apply, isolated build, contract tests, and catalog/home SSR QA **continued** with E15 recorded separately.

To reach `RELEASE_CANDIDATE_READY`, provide QA admin credentials locally and run `docs/operations/phase-2c-contact-e2e/closure/run-contact-admin-qa.mjs` against an approved non-production project ref.
