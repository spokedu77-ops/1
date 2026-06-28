-- SPOKEDU MASTER payment application hardening.
--
-- Applies Toss-confirmed payment results to order, subscription, and payment
-- evidence in one PostgreSQL transaction. Execute only through service_role.

ALTER TABLE public.spokedu_master_payment_orders
  ADD COLUMN IF NOT EXISTS last_error_code text,
  ADD COLUMN IF NOT EXISTS last_processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS process_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS applied_at timestamptz;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'spokedu_master_payment_orders_status_check'
      AND conrelid = 'public.spokedu_master_payment_orders'::regclass
  ) THEN
    ALTER TABLE public.spokedu_master_payment_orders
      DROP CONSTRAINT spokedu_master_payment_orders_status_check;
  END IF;
END
$$;

ALTER TABLE public.spokedu_master_payment_orders
  ADD CONSTRAINT spokedu_master_payment_orders_status_check
  CHECK (status IN ('pending', 'processing', 'active', 'recoverable_failed', 'cancelled', 'failed'));

CREATE OR REPLACE FUNCTION public.spokedu_master_apply_payment(
  p_user_id uuid,
  p_order_id text,
  p_payment_key text,
  p_plan text,
  p_amount integer,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_event_key text,
  p_source text
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
  IF p_source NOT IN ('confirm', 'webhook', 'cancel', 'partial_cancel_review_required') THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'invalid_source');
  END IF;

  IF p_plan NOT IN ('pro', 'team') THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'invalid_plan');
  END IF;

  v_expected_amount := CASE p_plan WHEN 'pro' THEN 39900 WHEN 'team' THEN 79000 END;
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

  IF v_order.payment_key IS NOT NULL AND v_order.payment_key <> p_payment_key THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'payment_key_conflict');
  END IF;

  UPDATE public.spokedu_master_payment_orders
     SET status = CASE WHEN status = 'active' THEN 'active' ELSE 'processing' END,
         payment_key = COALESCE(payment_key, p_payment_key),
         process_attempts = process_attempts + 1,
         last_error_code = NULL,
         last_processed_at = v_now
   WHERE order_id = p_order_id;

  SELECT *
    INTO v_subscription
    FROM public.spokedu_master_subscriptions
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF p_source = 'partial_cancel_review_required' THEN
    UPDATE public.spokedu_master_payment_orders
       SET status = CASE WHEN status = 'active' THEN 'active' ELSE 'recoverable_failed' END,
           last_error_code = 'partial_cancel_review_required',
           last_processed_at = v_now
     WHERE order_id = p_order_id;
    RETURN jsonb_build_object('status', 'ignored', 'reason', 'partial_cancel_review_required');
  END IF;

  IF p_source = 'cancel' THEN
    IF FOUND
      AND v_subscription.toss_order_id = p_order_id
      AND v_subscription.toss_payment_key = p_payment_key THEN
      UPDATE public.spokedu_master_subscriptions
         SET status = 'cancelled',
             updated_at = v_now
       WHERE user_id = p_user_id
         AND toss_order_id = p_order_id
         AND toss_payment_key = p_payment_key;
    END IF;

    UPDATE public.spokedu_master_payment_orders
       SET status = 'cancelled',
           payment_key = p_payment_key,
           last_processed_at = v_now
     WHERE order_id = p_order_id;

    RETURN jsonb_build_object('status', 'processed', 'cancelled', true);
  END IF;

  IF p_period_start IS NULL OR p_period_end IS NULL OR p_period_end <= p_period_start THEN
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
        'periodEnd', v_subscription.period_end
      );
    END IF;
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'active_order_without_subscription');
  END IF;

  INSERT INTO public.spokedu_master_subscriptions (
    user_id,
    plan,
    status,
    pg_provider,
    toss_payment_key,
    toss_order_id,
    period_start,
    period_end
  )
  VALUES (
    p_user_id,
    p_plan,
    'active',
    'tosspayments',
    p_payment_key,
    p_order_id,
    p_period_start,
    p_period_end
  )
  ON CONFLICT (user_id) DO UPDATE
    SET plan = EXCLUDED.plan,
        status = 'active',
        pg_provider = EXCLUDED.pg_provider,
        toss_payment_key = EXCLUDED.toss_payment_key,
        toss_order_id = EXCLUDED.toss_order_id,
        period_start = EXCLUDED.period_start,
        period_end = EXCLUDED.period_end,
        updated_at = v_now;

  UPDATE public.spokedu_master_payment_orders
     SET status = 'active',
         payment_key = p_payment_key,
         applied_at = COALESCE(applied_at, v_now),
         last_processed_at = v_now,
         last_error_code = NULL
   WHERE order_id = p_order_id;

  RETURN jsonb_build_object(
    'status', 'processed',
    'alreadyApplied', v_event_rows = 0,
    'periodEnd', p_period_end
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'unique_conflict');
END;
$$;

REVOKE ALL ON FUNCTION public.spokedu_master_apply_payment(
  uuid,
  text,
  text,
  text,
  integer,
  timestamptz,
  timestamptz,
  text,
  text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.spokedu_master_apply_payment(
  uuid,
  text,
  text,
  text,
  integer,
  timestamptz,
  timestamptz,
  text,
  text
) TO service_role;
