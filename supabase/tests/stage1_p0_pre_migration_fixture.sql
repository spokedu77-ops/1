\set ON_ERROR_STOP on

INSERT INTO auth.users (id, aud, role, email, created_at, updated_at)
SELECT id, 'authenticated', 'authenticated', email, now(), now()
FROM (VALUES
  ('10000000-0000-4000-8000-000000000001'::uuid, 'stage1-1@example.test'),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'stage1-2@example.test'),
  ('10000000-0000-4000-8000-000000000003'::uuid, 'stage1-3@example.test'),
  ('10000000-0000-4000-8000-000000000004'::uuid, 'stage1-4@example.test'),
  ('10000000-0000-4000-8000-000000000005'::uuid, 'stage1-5@example.test'),
  ('10000000-0000-4000-8000-000000000006'::uuid, 'stage1-6@example.test'),
  ('10000000-0000-4000-8000-000000000007'::uuid, 'stage1-7@example.test'),
  ('10000000-0000-4000-8000-000000000008'::uuid, 'stage1-8@example.test')
) AS fixture(id, email)
ON CONFLICT (id) DO NOTHING;

-- Existing paid subscription: the anchor migration must not infer an anchor.
INSERT INTO public.spokedu_master_subscriptions (
  user_id, plan, plan_id, status, current_period_start, current_period_end,
  next_billing_at, last_payment_at, current_amount
) VALUES (
  '10000000-0000-4000-8000-000000000001', 'lite', 'lite', 'active',
  '2026-01-31 03:30:00+00', '2026-02-28 03:30:00+00',
  '2026-02-28 03:30:00+00', '2026-01-31 03:30:00+00', 9900
);

INSERT INTO public.spokedu_master_payment_orders
  (order_id, user_id, plan, amount, status, payment_key, process_attempts, last_processed_at, applied_at, last_error_code)
VALUES
  ('spm-lite-fixture-clean', '10000000-0000-4000-8000-000000000002', 'lite', 9900, 'pending', NULL, 0, NULL, NULL, NULL),
  ('spm-lite-fixture-ambiguous', '10000000-0000-4000-8000-000000000003', 'lite', 9900, 'processing', NULL, 1, now(), NULL, NULL),
  ('spm-lite-fixture-approved', '10000000-0000-4000-8000-000000000004', 'lite', 9900, 'recoverable_failed', 'pk-approved', 1, now(), NULL, NULL),
  ('spm-lite-fixture-applied', '10000000-0000-4000-8000-000000000005', 'lite', 9900, 'active', 'pk-applied', 1, now(), now(), NULL),
  ('spm-lite-fixture-cancelled', '10000000-0000-4000-8000-000000000006', 'lite', 9900, 'cancelled', 'pk-cancelled', 1, now(), NULL, NULL),
  ('spm-lite-fixture-partial', '10000000-0000-4000-8000-000000000007', 'lite', 9900, 'recoverable_failed', 'pk-partial', 1, now(), NULL, 'partial_cancel_review_required');
