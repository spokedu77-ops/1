# SPOKEDU MASTER Lite restoration decision proposal

Status: PRODUCT OWNER DECISION PENDING — NOT APPROVED FOR PRODUCTION

## Decision candidate PD-BILLING-LITE-RESTORE

When a Lite-to-Premium upgrade payment is fully cancelled, restore only the
unused portion of the verified Lite purchase that existed immediately before
the upgrade. Never extend beyond that Lite purchase's original period end.

The refund removes Premium entitlement. Restoration is permitted only when the
upgrade order records an immutable reference to the replaced Lite payment and
its period. Automatic billing resumes only when the original billing consent,
customer key, and vault secret are still valid. Otherwise access may be
restored for the remaining paid period but automatic billing stays stopped.

Missing or conflicting source ledger data, partial refunds, payment-key
mismatches, an expired Lite period, or a provider/ledger mismatch require
manual review. Promotional grants are never created or modified by this flow.

## Proposed persistence

Add an immutable upgrade transition record containing:

- upgrade order ID and payment key
- source Lite order ID and payment key
- source Lite subscription ID
- source Lite period start/end and next billing time
- source billing-consent reference and vault-secret reference
- upgrade applied time, refund state, restoration state and reviewer metadata

The apply-upgrade RPC must create this record in the same transaction that
changes Lite to Premium. The full-cancel RPC must lock the upgrade order,
transition record, and subscription, verify the Toss-confirmed full refund,
and then perform exactly one of these transitions:

1. Source Lite still valid and billing consent valid: restore Lite through its
   original end, restore its original next billing time, and retain auto billing.
2. Source Lite still valid but billing consent cannot be proven: restore Lite
   through its original end with automatic billing stopped.
3. Source Lite expired or cannot be proven: remove refunded Premium access and
   set `manual_review_required`; do not synthesize a subscription or grant.

The transition is idempotent by upgrade order ID. A duplicate cancellation may
return the stored result but may not change entitlement or dates again.

## Required approval and verification

This proposal changes entitlement and persistence semantics and therefore
requires Product Owner approval, Product Contract update, a new migration, and
real PostgreSQL transaction/concurrency tests before implementation. No part of
this proposal is included in the current Production-ready migration.
