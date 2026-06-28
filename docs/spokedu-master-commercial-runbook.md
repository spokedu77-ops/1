# SPOKEDU MASTER commercial runbook

This runbook is the release checklist for SPOKEDU MASTER. It documents the current operational process only; it does not imply automated recovery screens or back-office tools that do not exist.

## Deployment

1. Confirm environment separation before any staging verification.
   - `STAGING_BASE_URL`
   - staging Supabase URL and anon key
   - staging Supabase service role key
   - Toss test client key and test secret key
   - disposable SPOKEDU MASTER QA account
   - `SPM_RUNTIME_ENV=staging`
   - `SPM_STAGING_WRITE_GUARD=ALLOW_STAGING_WRITES`
   - approved staging Supabase project ref
2. Apply staging migrations before production migrations.
   - `spokedu_master_replace_class_record`
   - `spokedu_master_delete_operational_data`
   - `spokedu_master_apply_payment`
   - `spokedu_master_create_class_record`
3. Verify migration contracts.
   - Function signature is unchanged from the app call site.
   - `SECURITY DEFINER` and fixed `search_path` are present.
   - `public`, `anon`, and `authenticated` execution are revoked.
   - `service_role` execute is granted.
4. Run CI gate.
   - TypeScript
   - ESLint
   - related Vitest
   - migration contract tests
   - production build
   - `next start` route smoke
   - logged commercial smoke when QA credentials are available
   - `git diff --check`
5. Post-deploy smoke.
   - `/login`
   - `/spokedu-master/landing`
   - `/spokedu-master/library`
   - `/spokedu-master/payment`
   - one logged-in protected route with a disposable QA account
6. Rollback criteria.
   - Login failure
   - protected route redirect loop
   - payment succeeds but entitlement is not activated
   - class record save failure
   - owner data exposure
   - blank screen or infinite loading on a core route

## Payment

Use Toss sandbox and staging DB for release verification. Never use production Toss keys or production DB for this checklist.

- Successful payment but entitlement missing:
  1. Check order status.
  2. Check subscription row for the same owner.
  3. Check webhook event storage.
  4. Run reconciliation in read-only mode.
- `recoverable_failed`:
  1. Confirm the failure stage.
  2. Confirm the same order/payment key can be retried idempotently.
  3. Do not manually extend the subscription without payment evidence.
- Full cancellation:
  1. Confirm cancellation applies to the matching payment only.
  2. Confirm it does not cancel a newer entitlement.
- Partial cancellation:
  1. Mark for manual review.
  2. Do not automatically change entitlement unless the implemented policy explicitly supports it.
- Refund inquiry:
  1. Confirm requester identity.
  2. Confirm order and payment evidence.
  3. Respond from the official support channel.

## Data

- Class record save failure:
  1. Check RPC error monitoring.
  2. Confirm no partial parent/student rows were committed.
  3. Ask the user to retry only after the service state is healthy.
- Duplicate class record report:
  1. Check request key/idempotency information.
  2. Confirm whether the duplicate came from a retry or a separate user action.
- MASTER operational data deletion request:
  1. Confirm the exact confirmation phrase.
  2. Run only the operational data deletion endpoint/RPC.
  3. Do not delete auth accounts, subscriptions, payment orders, or public content.
- Account withdrawal request:
  1. Treat separately from MASTER operational data deletion.
  2. Confirm legal retention requirements for payment and access logs before deletion.
- Backup/restore request:
  1. There is no fully automated user-facing restore flow documented for this release.
  2. Escalate to an operator with database access policy approval.

## Failures

- Auth outage:
  - Confirm Supabase auth status.
  - Protected routes should fail closed.
  - Do not bypass access checks.
- Supabase outage:
  - Confirm access/subscription APIs do not treat DB errors as free access.
  - Preserve user input where the UI already supports retry.
- Toss outage:
  - Stop new payment smoke.
  - Keep failed payment details in monitoring only; do not expose payment keys to users.
- SPOMOVE runtime failure:
  - Confirm selected program and settings are preserved.
  - Ask the user to retry or choose another program.
- Customer notice trigger:
  - Core login/access/payment/record save outage.
  - Confirmed owner data isolation issue.
  - Any incident that may affect payment evidence or personal data.
- Monitoring check locations:
  - Server route errors
  - payment apply/reconciliation logs
  - client error reporting for unexpected UI crashes

## GitHub Actions lanes

- Lane A — Linux isolated verification:
  - Runs on GitHub Actions Ubuntu only.
  - Uses CI-safe placeholder service values.
  - Must not call real Supabase or Toss.
  - Runs build, TypeScript, ESLint, related Vitest, migration contracts, Linux `next start`, non-login route smoke, mocked route contracts, and `git diff --check`.
- Preview read-only smoke:
  - Runs only when a Vercel Preview URL is provided.
  - Accepts only HTTPS Vercel preview domains.
  - Runs read-only route checks.
- Lane B — remote staging validation:
  - Runs only after explicit workflow dispatch and staging preflight.
  - Skips with `STAGING VALIDATION SKIPPED — unsafe or incomplete staging configuration` when any guard is incomplete.
  - Release/commercial branches must not treat a staging skip as commercial readiness.

## Required GitHub Secrets

Only store the secret names below. Do not commit secret values.

- `STAGING_BASE_URL`
- `SPM_RUNTIME_ENV`
- `SPM_APPROVED_STAGING_SUPABASE_REF`
- `SPM_STAGING_WRITE_GUARD`
- `STAGING_NEXT_PUBLIC_SUPABASE_URL`
- `STAGING_NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `STAGING_SUPABASE_SERVICE_ROLE_KEY`
- `STAGING_NEXT_PUBLIC_TOSS_CLIENT_KEY`
- `STAGING_TOSS_SECRET_KEY`
- `SPOKEDU_MASTER_QA_ID`
- `SPOKEDU_MASTER_QA_PASSWORD`
- `SPOKEDU_MASTER_QA_SECONDARY_ID`
- `SPOKEDU_MASTER_QA_SECONDARY_PASSWORD`
- `SPM_DISPOSABLE_QA_ALLOWLIST`

## Artifacts

Expected artifacts:

- `commercial-verification-report.json`
- Playwright report when browser smoke runs
- failure screenshot when browser smoke fails
- failure trace when browser smoke fails
- migration verification summary when staging migration verification runs

Never include:

- email raw values
- student names
- `paymentKey`
- full `orderId`
- access token
- cookie
- service role key

## Failure classification

Classify each failure as exactly one of:

- `PRODUCT_BLOCKER`
- `PRODUCT_CRITICAL`
- `TEST_SCRIPT`
- `CI_ENVIRONMENT`
- `STAGING_CONFIGURATION`
- `EXTERNAL_PROVIDER`
