# 09 Change scope audit

## In scope (this remediation)

- SSOT docs + cursor rule
- Legacy `/info/curriculum`, `/info/private` redirects
- Gym CRM API + form
- `/consult` dev message removal
- Public lead spam guard + rate limit migration
- `brand.ts` FACT_REQUIRED mail order
- `subscription-v17` removal + curriculum landing simplification
- `move-report` private link fix

## Explicitly out of scope

- MASTER LAB payment, auth, billing
- Prior WIP on admin mileage/inventory/migrations (may appear in dirty `git status` — **not part of REMEDIATION.diff**)

## New files

- `app/api/info/gym/leads/*`
- `app/lib/server/publicLeadSpamGuard*`
- `app/spokedu/lib/legacy-info-redirects*`
- `supabase/migrations/20261018120000_public_lead_rate_limit.sql`
- `docs/operations/public-website-audit-remediation/**`

Patch: `REMEDIATION.diff` (scoped paths only)
