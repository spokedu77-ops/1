# SPOKEDU MASTER Commercial Risk Audit

Date: 2026-06-21

This audit records only what is visible in repository code and docs. It does not claim that production infrastructure outside the repository has been verified.

## Actual Payment Grants Access

- Current implementation: `POST /api/spokedu-master/payment/confirm` confirms a Toss payment and upserts `spokedu_master_subscriptions` with `status: active`, `plan`, `period_start`, and `period_end`. Access is then granted by `requireSpokeduMasterAccess()` when the row is active and not expired.
- Evidence: `app/api/spokedu-master/payment/confirm/route.ts`, `app/lib/server/spokeduMasterAccess.ts`, `supabase/migrations/20260605090000_spokedu_master_subscriptions.sql`.
- Risk grade: P1.
- Required before paid launch: Verify a real Toss payment in production creates or updates the subscription row and makes `/api/spokedu-master/access` return 200 for that user.

## Payment Failure, Cancellation, and Refund

- Current implementation: payment confirm failures return errors from the confirm route. The customer portal route returns 410 and says cancellation or payment-method changes are handled through customer support. No SPOKEDU MASTER cancellation or refund sync route was found.
- Evidence: `app/api/spokedu-master/payment/confirm/route.ts`, `app/api/spokedu-master/payment/portal/route.ts`.
- Risk grade: P1.
- Required before paid launch: Define and document the operational path for failed payment support, cancellation, refund, and subscription status updates.

## Subscription Expiration

- Current implementation: `requireSpokeduMasterAccess()` treats a paid row as expired when `period_end` is in the past, even if the stored row status remains `active`. The subscription API also maps expired paid rows to expired access state.
- Evidence: `app/lib/server/spokeduMasterAccess.ts`, `app/api/spokedu-master/subscription/route.ts`.
- Risk grade: P1.
- Required before paid launch: Add or document the operational process that reconciles expired rows and customer communication after expiration.

## Webhook Security and Idempotency

- Current implementation: the SPOKEDU MASTER payment webhook uses `tosspayments-webhook-transmission-id` as the primary idempotency key, verifies incoming payment events by retrieving the payment from Toss with `TOSS_SECRET_KEY`, then compares `paymentKey`, `orderId`, status, currency, and amount before mutating subscriptions. Headerless local or legacy deliveries use a deterministic fallback key based on event type, `paymentKey`, and transaction/status. Webhook event idempotency is stored in `spokedu_master_payment_webhook_events`, and checkout stores `orderId -> user_id` ownership in `spokedu_master_payment_orders`. `PAYMENT_STATUS_CHANGED` uses the `data` Payment object. `CANCEL_STATUS_CHANGED` is not treated as a Payment object; it is processed only when a safe `paymentKey` is present and a Toss payment lookup confirms full cancellation.
- Evidence: `app/api/spokedu-master/payment/webhook/route.ts`, `app/api/spokedu-master/payment/create-checkout/route.ts`, `supabase/migrations/20260621120000_spokedu_master_payment_webhook_events.sql`.
- Risk grade: P1.
- Required before paid launch: Register the production Toss webhook, verify real Toss `PAYMENT_STATUS_CHANGED` and `CANCEL_STATUS_CHANGED` payloads and the `tosspayments-webhook-transmission-id` header against this handler, confirm 10-second response behavior in production, and confirm operational policy for partial refunds.

## Production Error Monitoring

- Current implementation: SPOKEDU MASTER now has a sanitized production error reporter that posts summary events to `SPOKEDU_MONITORING_WEBHOOK_URL` when configured and falls back to no-op/dev logging when it is absent. Server access checks, operational API 500 paths, payment checkout, payment confirm, and payment webhook internal failures report safe route/status/stage tags. A SPOKEDU MASTER error boundary sends client runtime error summaries through an internal client error route without raw messages, stacks, student data, request bodies, cookies, tokens, or payment payloads.
- Evidence: `app/lib/monitoring/errorReporter.ts`, `app/api/spokedu-master/client-errors/route.ts`, `app/spokedu-master/error.tsx`, `app/api/spokedu-master/payment/*`, `app/api/spokedu-master/students/route.ts`, `app/api/spokedu-master/class-records/route.ts`, `app/api/spokedu-master/explanations/route.ts`, `app/lib/server/spokeduMasterAccess.ts`.
- Risk grade: P1.
- Required before paid launch: Configure the production monitoring endpoint, send one controlled server error and one controlled client error, confirm payment failure events are visible to operators, and inspect sample events for sensitive information before opening paid sales.

## Production DB Backup and Restore

- Current implementation: operational tables use Supabase migrations and owner-scoped RLS. The repository now includes a SPOKEDU MASTER backup/restore runbook and a read-only data-integrity script for temporary restore verification. The script checks required tables, columns, RLS enablement, policy presence, orphan class-record child rows, owner mismatches, duplicate subscriptions, duplicate payment orders, duplicate webhook event keys, and payment order/subscription owner mismatches. The backup scope includes owner-scoped operational tables, payment entitlement tables, webhook idempotency, and the MASTER program catalog table `spokedu_master_program_meta`. Repository files still do not confirm the actual production Supabase backup schedule, PITR setting, restore owner, or a completed restore rehearsal. The repository contains alter migrations for `spokedu_master_program_meta`, but its original create-table migration or baseline schema was not found in this audit.
- Evidence: `supabase/migrations/20260616120000_spokedu_master_operational_data.sql`, `supabase/migrations/20260619120000_spokedu_master_explanations.sql`, `supabase/migrations/20260621120000_spokedu_master_payment_webhook_events.sql`, `scripts/spokedu-master-data-integrity.mjs`, `docs/spokedu-master-backup-restore-runbook.md`.
- Risk grade: P1.
- Required before paid launch: Confirm Supabase production backups and PITR, confirm or add the baseline schema source for `spokedu_master_program_meta`, run one restore rehearsal into a temporary database, run `npm.cmd run qa:spokedu-master:data-integrity` against the restored database, and record the restore owner and stop criteria.

## Privacy Deletion and Account Closure

- Current implementation: operational rows reference `auth.users(id)` with `ON DELETE CASCADE`, so deleting the auth user would remove owner-scoped operational data. A user-facing account deletion request flow for SPOKEDU MASTER was not found.
- Evidence: `supabase/migrations/20260616120000_spokedu_master_operational_data.sql`, `supabase/migrations/20260619120000_spokedu_master_explanations.sql`, `app/info/gym/privacy/page.tsx`.
- Risk grade: P1.
- Required before paid launch: Define the account deletion and personal data deletion process, including who can execute it and how backups are handled.

## Institution Shared Accounts

- Current implementation: SPOKEDU MASTER operational data is owned by `owner_id = auth.users.id`. The `team` plan exists, but no organization or institution tenant model was found for shared staff access.
- Evidence: operational migrations and API owner filters, `app/api/spokedu-master/payment/confirm/route.ts`.
- Risk grade: P1.
- Required before paid launch: Clarify that current sales are per-login, or implement an organization/account ownership model before selling shared institution accounts.

## Production Environment Verification Gaps

- Current implementation: browser smoke covers critical user flows with DTO-shaped mocks. It does not prove production payment, production DB writes, production Service Worker cache state, or real no-access account behavior.
- Evidence: `scripts/spokedu-master-commercial-smoke-qa.mjs`, `docs/spokedu-master-release-checklist.md`.
- Risk grade: P1.
- Required before paid launch: Complete the production environment checklist with real paid, trial/no-access, and operational data accounts.
