# 10 Release handoff

## Verdict

**`LOCAL_REMEDIATION_READY_WITH_FACT_GAPS`**

Functional fixes and local build/typecheck pass. **통신판매업 신고번호** awaits operator documents (FACT_REQUIRED). **Gym live CRM E2E** and **E15** admin QA not executed in this session.

## Pre-deploy

1. Apply Supabase migration `20261018120000_public_lead_rate_limit.sql` on staging/production.
2. Set server-only `GYM_LEADS_GOOGLE_SCRIPT_URL` if Sheets sync still required.
3. Confirm mail-order report number with legal/PG; then set `brandProfile.mailOrderReportNumber` and footer copy.
4. Smoke ad URLs: `/info/curriculum`, `/info/private`, `/info/gym` form, `/consult`, `/spokedu-lab`.

## Not done (by instruction)

- Commit, push, production deploy

ZIP: `SPOKEDU_PUBLIC_WEBSITE_REMEDIATION_FINAL.zip`
