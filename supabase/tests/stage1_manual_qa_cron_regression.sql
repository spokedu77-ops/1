\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (id, aud, role, email, created_at, updated_at)
SELECT id, 'authenticated', 'authenticated', email, now(), now()
FROM (VALUES
  ('30000000-0000-4000-8000-000000000001'::uuid, 'manual-lite@example.test'),
  ('30000000-0000-4000-8000-000000000002'::uuid, 'manual-premium@example.test'),
  ('30000000-0000-4000-8000-000000000003'::uuid, 'toss-premium@example.test')
) AS fixture(id, email)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.spokedu_master_subscriptions (
  user_id, plan, plan_id, status, pg_provider, current_period_start,
  current_period_end, next_billing_at, last_payment_at, current_amount,
  cancel_at_period_end, renewal_retry_count, billing_anchor_day,
  billing_anchor_is_eom, billing_anchor_timezone
) VALUES
  ('30000000-0000-4000-8000-000000000001', 'lite', 'lite', 'active', 'manual_qa', now() - interval '2 months', now() - interval '1 month', now() - interval '1 month', NULL, 9900, false, 0, 31, true, 'Asia/Seoul'),
  ('30000000-0000-4000-8000-000000000002', 'premium', 'premium', 'active', 'manual_qa', now() - interval '2 months', now() - interval '1 month', now() - interval '1 month', NULL, 28900, false, 0, 30, false, 'Asia/Seoul'),
  ('30000000-0000-4000-8000-000000000003', 'premium', 'premium', 'active', 'tosspayments', now() - interval '2 months', now() - interval '1 month', now() - interval '1 month', now() - interval '2 months', 28900, false, 0, 29, false, 'Asia/Seoul');

DO $$
DECLARE
  v_manual_due integer;
  v_toss_due integer;
  v_recovery integer;
  v_cron_jobs integer;
  v_schedule text;
  v_definition text;
BEGIN
  SELECT
    count(*) FILTER (WHERE subscription.pg_provider = 'manual_qa'),
    count(*) FILTER (WHERE subscription.pg_provider = 'tosspayments')
  INTO v_manual_due, v_toss_due
  FROM public.spokedu_master_subscriptions AS subscription
  WHERE subscription.user_id IN (
      '30000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000002',
      '30000000-0000-4000-8000-000000000003'
    )
    AND subscription.status = 'active'
    AND subscription.cancel_at_period_end = false
    AND subscription.pg_provider = 'tosspayments'
    AND COALESCE(subscription.plan_id, subscription.plan) IN ('lite', 'premium')
    AND subscription.next_billing_at <= now()
    AND (subscription.next_retry_at IS NULL OR subscription.next_retry_at <= now())
    AND subscription.renewal_retry_count < 5
    AND subscription.billing_anchor_day IS NOT NULL;

  IF v_manual_due <> 0 OR v_toss_due <> 1 THEN
    RAISE EXCEPTION 'provider predicate failed: manual %, toss %', v_manual_due, v_toss_due;
  END IF;

  SELECT count(*) INTO v_recovery
  FROM public.spokedu_master_payment_orders AS payment_order
  WHERE payment_order.order_id = 'spm-lite-fixture-approved'
    AND payment_order.charge_state = 'approved_unapplied'
    AND payment_order.operator_review_required = false;
  IF v_recovery <> 1 THEN
    RAISE EXCEPTION 'approved-unapplied recovery path missing';
  END IF;

  SELECT count(*), min(schedule) INTO v_cron_jobs, v_schedule
  FROM cron.job WHERE jobname = 'spokedu-master-billing-renew-hourly';
  IF v_cron_jobs <> 1 OR v_schedule <> '0 * * * *' THEN
    RAISE EXCEPTION 'cron invariant failed: jobs %, schedule %', v_cron_jobs, v_schedule;
  END IF;

  SELECT pg_get_functiondef('public.spokedu_master_run_billing_renewal_cron()'::regprocedure)
  INTO v_definition;
  IF position('spokedu_master_billing_renew_url' in v_definition) = 0
     OR position('spokedu_master_billing_cron_secret' in v_definition) = 0 THEN
    RAISE EXCEPTION 'Vault secret name compatibility failed';
  END IF;

  RAISE NOTICE 'manual_due=%, toss_due=%, recovery=%, cron_jobs=%, schedule=%',
    v_manual_due, v_toss_due, v_recovery, v_cron_jobs, v_schedule;
END;
$$;

SELECT plan, status, pg_provider, current_amount
FROM public.spokedu_master_subscriptions
WHERE user_id IN (
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002'
)
ORDER BY plan;

ROLLBACK;
