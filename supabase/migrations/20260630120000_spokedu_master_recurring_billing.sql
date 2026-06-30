-- SPOKEDU MASTER recurring billing foundation.
--
-- This replaces the previous one-time 30-day payment contract with
-- lite/premium monthly recurring billing state. Billing keys are service-role
-- only data and must never be selected by client routes.

ALTER TABLE public.spokedu_master_payment_orders
  ADD COLUMN IF NOT EXISTS billing_cycle_key text,
  ADD COLUMN IF NOT EXISTS last_error_code text,
  ADD COLUMN IF NOT EXISTS last_processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS process_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS applied_at timestamptz;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'spokedu_master_payment_orders_plan_check'
      AND conrelid = 'public.spokedu_master_payment_orders'::regclass
  ) THEN
    ALTER TABLE public.spokedu_master_payment_orders
      DROP CONSTRAINT spokedu_master_payment_orders_plan_check;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'spokedu_master_payment_orders_status_check'
      AND conrelid = 'public.spokedu_master_payment_orders'::regclass
  ) THEN
    ALTER TABLE public.spokedu_master_payment_orders
      DROP CONSTRAINT spokedu_master_payment_orders_status_check;
  END IF;
END
$$;

ALTER TABLE public.spokedu_master_payment_orders
  ADD CONSTRAINT spokedu_master_payment_orders_plan_check
  CHECK (plan IN ('lite', 'premium')) NOT VALID,
  ADD CONSTRAINT spokedu_master_payment_orders_status_check
  CHECK (status IN ('pending', 'processing', 'active', 'recoverable_failed', 'cancelled', 'failed'));

CREATE UNIQUE INDEX IF NOT EXISTS spm_payment_orders_cycle_unique
  ON public.spokedu_master_payment_orders (user_id, billing_cycle_key)
  WHERE billing_cycle_key IS NOT NULL;

ALTER TABLE public.spokedu_master_subscriptions
  ADD COLUMN IF NOT EXISTS plan_id text,
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS next_billing_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_customer_key text,
  ADD COLUMN IF NOT EXISTS provider_billing_key text,
  ADD COLUMN IF NOT EXISTS last_payment_at timestamptz;

UPDATE public.spokedu_master_subscriptions
   SET plan_id = COALESCE(plan_id, CASE WHEN plan IN ('lite', 'premium') THEN plan ELSE NULL END),
       current_period_start = COALESCE(current_period_start, period_start),
       current_period_end = COALESCE(current_period_end, period_end),
       next_billing_at = COALESCE(next_billing_at, period_end)
 WHERE plan_id IS NULL
    OR current_period_start IS NULL
    OR current_period_end IS NULL
    OR next_billing_at IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'spm_subscriptions_plan_check'
      AND conrelid = 'public.spokedu_master_subscriptions'::regclass
  ) THEN
    ALTER TABLE public.spokedu_master_subscriptions
      DROP CONSTRAINT spm_subscriptions_plan_check;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'spm_subscriptions_status_check'
      AND conrelid = 'public.spokedu_master_subscriptions'::regclass
  ) THEN
    ALTER TABLE public.spokedu_master_subscriptions
      DROP CONSTRAINT spm_subscriptions_status_check;
  END IF;
END
$$;

ALTER TABLE public.spokedu_master_subscriptions
  ADD CONSTRAINT spm_subscriptions_plan_check
  CHECK (plan IN ('lite', 'premium')) NOT VALID,
  ADD CONSTRAINT spm_subscriptions_plan_id_check
  CHECK (plan_id IN ('lite', 'premium')) NOT VALID,
  ADD CONSTRAINT spm_subscriptions_status_check
  CHECK (status IN ('active', 'past_due', 'cancelled', 'expired', 'pending'));

CREATE INDEX IF NOT EXISTS idx_spm_subscriptions_due_billing
  ON public.spokedu_master_subscriptions (status, next_billing_at)
  WHERE cancel_at_period_end = false;

CREATE OR REPLACE FUNCTION public.spokedu_master_apply_payment(
  p_user_id uuid,
  p_order_id text,
  p_payment_key text,
  p_plan text,
  p_amount integer,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_next_billing_at timestamptz,
  p_event_key text,
  p_source text,
  p_provider_customer_key text DEFAULT NULL,
  p_provider_billing_key text DEFAULT NULL,
  p_billing_cycle_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.spokedu_master_payment_orders%ROWTYPE;
  v_subscription public.spokedu_master_subscriptions%ROWTYPE;
  v_expected_amount integer;
  v_event_rows integer := 0;
  v_now timestamptz := now();
BEGIN
  IF p_source NOT IN ('initial', 'renewal', 'webhook', 'cancel', 'partial_cancel_review_required') THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'invalid_source');
  END IF;

  IF p_plan NOT IN ('lite', 'premium') THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'invalid_plan');
  END IF;

  v_expected_amount := CASE p_plan WHEN 'lite' THEN 9900 WHEN 'premium' THEN 28900 END;
  IF p_amount IS NULL OR p_amount <> v_expected_amount THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'amount_mismatch');
  END IF;

  INSERT INTO public.spokedu_master_payment_webhook_events (
    event_key,
    event_type,
    payment_key,
    order_id,
    status
  )
  VALUES (
    p_event_key,
    p_source,
    p_payment_key,
    p_order_id,
    CASE WHEN p_source = 'partial_cancel_review_required' THEN 'ignored' ELSE 'processed' END
  )
  ON CONFLICT (event_key) DO NOTHING;
  GET DIAGNOSTICS v_event_rows = ROW_COUNT;

  SELECT *
    INTO v_order
    FROM public.spokedu_master_payment_orders
   WHERE order_id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'order_not_found');
  END IF;

  IF v_order.user_id <> p_user_id THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'order_owner_mismatch');
  END IF;

  IF v_order.plan <> p_plan OR p_order_id NOT LIKE ('spm-' || p_plan || '-%') THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'plan_mismatch');
  END IF;

  IF v_order.amount <> p_amount THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'amount_mismatch');
  END IF;

  IF p_billing_cycle_key IS NOT NULL
     AND v_order.billing_cycle_key IS NOT NULL
     AND v_order.billing_cycle_key <> p_billing_cycle_key THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'billing_cycle_mismatch');
  END IF;

  IF v_order.payment_key IS NOT NULL AND v_order.payment_key <> p_payment_key THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'payment_key_conflict');
  END IF;

  SELECT *
    INTO v_subscription
    FROM public.spokedu_master_subscriptions
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF p_source = 'partial_cancel_review_required' THEN
    UPDATE public.spokedu_master_payment_orders
       SET status = CASE WHEN status = 'active' THEN 'active' ELSE 'recoverable_failed' END,
           last_error_code = 'partial_cancel_review_required',
           last_processed_at = v_now,
           process_attempts = process_attempts + 1
     WHERE order_id = p_order_id;
    RETURN jsonb_build_object('status', 'ignored', 'reason', 'partial_cancel_review_required');
  END IF;

  IF p_source = 'cancel' THEN
    IF FOUND THEN
      UPDATE public.spokedu_master_subscriptions
         SET cancel_at_period_end = true,
             canceled_at = COALESCE(canceled_at, v_now),
             updated_at = v_now
       WHERE user_id = p_user_id;
    END IF;

    UPDATE public.spokedu_master_payment_orders
       SET status = 'cancelled',
           payment_key = COALESCE(payment_key, p_payment_key),
           last_processed_at = v_now
     WHERE order_id = p_order_id;

    RETURN jsonb_build_object('status', 'processed', 'cancelled', true);
  END IF;

  IF p_period_start IS NULL
     OR p_period_end IS NULL
     OR p_next_billing_at IS NULL
     OR p_period_end <= p_period_start
     OR p_next_billing_at <> p_period_end THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'invalid_period');
  END IF;

  IF v_order.status = 'active' THEN
    IF FOUND
      AND v_subscription.toss_order_id = p_order_id
      AND v_subscription.toss_payment_key = p_payment_key
      AND v_subscription.status = 'active' THEN
      RETURN jsonb_build_object(
        'status', 'processed',
        'alreadyApplied', true,
        'periodEnd', v_subscription.current_period_end,
        'nextBillingAt', v_subscription.next_billing_at
      );
    END IF;
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'active_order_without_subscription');
  END IF;

  IF p_source = 'renewal' AND NOT FOUND THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'subscription_not_found');
  END IF;

  IF p_source = 'renewal'
     AND FOUND
     AND v_subscription.current_period_start = p_period_start
     AND v_subscription.current_period_end = p_period_end THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'billing_cycle_already_processed');
  END IF;

  INSERT INTO public.spokedu_master_subscriptions (
    user_id,
    plan,
    plan_id,
    status,
    pg_provider,
    toss_payment_key,
    toss_order_id,
    period_start,
    period_end,
    current_period_start,
    current_period_end,
    next_billing_at,
    cancel_at_period_end,
    provider_customer_key,
    provider_billing_key,
    last_payment_at
  )
  VALUES (
    p_user_id,
    p_plan,
    p_plan,
    'active',
    'tosspayments',
    p_payment_key,
    p_order_id,
    p_period_start,
    p_period_end,
    p_period_start,
    p_period_end,
    p_next_billing_at,
    false,
    p_provider_customer_key,
    p_provider_billing_key,
    p_period_start
  )
  ON CONFLICT (user_id) DO UPDATE
    SET plan = EXCLUDED.plan,
        plan_id = EXCLUDED.plan_id,
        status = 'active',
        pg_provider = EXCLUDED.pg_provider,
        toss_payment_key = EXCLUDED.toss_payment_key,
        toss_order_id = EXCLUDED.toss_order_id,
        period_start = EXCLUDED.period_start,
        period_end = EXCLUDED.period_end,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        next_billing_at = EXCLUDED.next_billing_at,
        cancel_at_period_end = false,
        provider_customer_key = COALESCE(EXCLUDED.provider_customer_key, spokedu_master_subscriptions.provider_customer_key),
        provider_billing_key = COALESCE(EXCLUDED.provider_billing_key, spokedu_master_subscriptions.provider_billing_key),
        last_payment_at = EXCLUDED.last_payment_at,
        updated_at = v_now;

  UPDATE public.spokedu_master_payment_orders
     SET status = 'active',
         payment_key = p_payment_key,
         billing_cycle_key = COALESCE(p_billing_cycle_key, billing_cycle_key),
         applied_at = COALESCE(applied_at, v_now),
         last_processed_at = v_now,
         last_error_code = NULL,
         process_attempts = process_attempts + 1
   WHERE order_id = p_order_id;

  RETURN jsonb_build_object(
    'status', 'processed',
    'alreadyApplied', v_event_rows = 0,
    'periodEnd', p_period_end,
    'nextBillingAt', p_next_billing_at
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'unique_conflict');
END;
$$;

REVOKE ALL ON FUNCTION public.spokedu_master_apply_payment(
  uuid, text, text, text, integer, timestamptz, timestamptz, timestamptz, text, text, text, text, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.spokedu_master_apply_payment(
  uuid, text, text, text, integer, timestamptz, timestamptz, timestamptz, text, text, text, text, text
) TO service_role;
