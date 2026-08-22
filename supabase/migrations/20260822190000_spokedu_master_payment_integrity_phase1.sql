-- SPOKEDU MASTER commercial hardening phase 1.
-- Keeps charged orders recoverable, isolates historical refunds, and gives
-- renewal failures a retry window so they cannot poison the due queue.

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

ALTER TABLE public.spokedu_master_subscriptions
  ADD COLUMN IF NOT EXISTS current_amount integer,
  ADD COLUMN IF NOT EXISTS pending_billing_key_secret_id uuid,
  ADD COLUMN IF NOT EXISTS renewal_retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_billing_error text,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;

ALTER TABLE public.spokedu_master_subscriptions
  DROP CONSTRAINT IF EXISTS spm_subscriptions_current_amount_check;

ALTER TABLE public.spokedu_master_subscriptions
  ADD CONSTRAINT spm_subscriptions_current_amount_check
  CHECK (
    current_amount IS NULL
    OR (plan = 'lite' AND current_amount = 9900)
    OR (plan = 'premium' AND current_amount = 28900)
  ) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_spm_subscriptions_due_retry
  ON public.spokedu_master_subscriptions (status, next_retry_at, next_billing_at)
  WHERE cancel_at_period_end = false;

CREATE OR REPLACE FUNCTION public.spokedu_master_store_billing_key(
  p_user_id uuid,
  p_billing_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_old_pending_secret_id uuid;
  v_new_secret_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_billing_key IS NULL OR length(p_billing_key) = 0 THEN
    RAISE EXCEPTION 'missing_billing_key_input';
  END IF;

  INSERT INTO public.spokedu_master_subscriptions (user_id, plan, status, pg_provider)
  VALUES (p_user_id, 'lite', 'pending', 'tosspayments')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT pending_billing_key_secret_id
    INTO v_old_pending_secret_id
    FROM public.spokedu_master_subscriptions
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'subscription_not_found';
  END IF;

  v_new_secret_id := vault.create_secret(
    p_billing_key,
    'spokedu-master-pending-billing-key-' || p_user_id::text || '-' || gen_random_uuid()::text,
    'SPOKEDU MASTER pending recurring billing key'
  );

  UPDATE public.spokedu_master_subscriptions
     SET pending_billing_key_secret_id = v_new_secret_id,
         provider_billing_key = NULL,
         updated_at = now()
   WHERE user_id = p_user_id;

  IF v_old_pending_secret_id IS NOT NULL AND v_old_pending_secret_id <> v_new_secret_id THEN
    PERFORM vault.delete_secret(v_old_pending_secret_id);
  END IF;

  RETURN v_new_secret_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.spokedu_master_read_billing_key(
  p_user_id uuid,
  p_secret_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_billing_key text;
BEGIN
  IF p_user_id IS NULL OR p_secret_id IS NULL THEN
    RAISE EXCEPTION 'missing_billing_key_secret_input';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.spokedu_master_subscriptions
     WHERE user_id = p_user_id
       AND (
         provider_billing_key_secret_id = p_secret_id
         OR pending_billing_key_secret_id = p_secret_id
       )
  ) THEN
    RAISE EXCEPTION 'billing_key_secret_owner_mismatch';
  END IF;

  SELECT decrypted_secret INTO v_billing_key
    FROM vault.decrypted_secrets
   WHERE id = p_secret_id;

  IF v_billing_key IS NULL OR length(v_billing_key) = 0 THEN
    RAISE EXCEPTION 'billing_key_secret_not_found';
  END IF;

  RETURN v_billing_key;
END;
$$;

CREATE OR REPLACE FUNCTION public.spokedu_master_delete_billing_key(
  p_user_id uuid,
  p_secret_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_current_secret_id uuid;
  v_pending_secret_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_secret_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT provider_billing_key_secret_id, pending_billing_key_secret_id
    INTO v_current_secret_id, v_pending_secret_id
    FROM public.spokedu_master_subscriptions
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF NOT FOUND OR (v_current_secret_id IS DISTINCT FROM p_secret_id AND v_pending_secret_id IS DISTINCT FROM p_secret_id) THEN
    RAISE EXCEPTION 'billing_key_secret_owner_mismatch';
  END IF;

  UPDATE public.spokedu_master_subscriptions
     SET provider_billing_key_secret_id = CASE
           WHEN provider_billing_key_secret_id = p_secret_id THEN NULL
           ELSE provider_billing_key_secret_id
         END,
         pending_billing_key_secret_id = CASE
           WHEN pending_billing_key_secret_id = p_secret_id THEN NULL
           ELSE pending_billing_key_secret_id
         END,
         provider_billing_key = NULL,
         updated_at = now()
   WHERE user_id = p_user_id;

  PERFORM vault.delete_secret(p_secret_id);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.spokedu_master_store_billing_key(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.spokedu_master_read_billing_key(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.spokedu_master_delete_billing_key(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spokedu_master_store_billing_key(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.spokedu_master_read_billing_key(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.spokedu_master_delete_billing_key(uuid, uuid) TO service_role;

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
  p_provider_billing_key_secret_id uuid DEFAULT NULL,
  p_billing_cycle_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_order public.spokedu_master_payment_orders%ROWTYPE;
  v_subscription public.spokedu_master_subscriptions%ROWTYPE;
  v_expected_amount integer;
  v_event_rows integer := 0;
  v_now timestamptz := now();
  v_subscription_matches_payment boolean := false;
  v_previous_secret_id uuid;
  v_pending_secret_id uuid;
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

  SELECT * INTO v_order
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

  SELECT * INTO v_subscription
    FROM public.spokedu_master_subscriptions
   WHERE user_id = p_user_id
   FOR UPDATE;
  v_subscription_matches_payment := FOUND
    AND v_subscription.toss_order_id = p_order_id
    AND v_subscription.toss_payment_key = p_payment_key;

  INSERT INTO public.spokedu_master_payment_webhook_events (
    event_key, event_type, payment_key, order_id, status
  ) VALUES (
    p_event_key,
    p_source,
    p_payment_key,
    p_order_id,
    CASE WHEN p_source = 'partial_cancel_review_required' THEN 'ignored' ELSE 'processed' END
  ) ON CONFLICT (event_key) DO NOTHING;
  GET DIAGNOSTICS v_event_rows = ROW_COUNT;

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
    UPDATE public.spokedu_master_payment_orders
       SET status = 'cancelled',
           payment_key = COALESCE(payment_key, p_payment_key),
           last_processed_at = v_now,
           process_attempts = process_attempts + 1
     WHERE order_id = p_order_id;

    IF v_subscription_matches_payment THEN
      v_previous_secret_id := v_subscription.provider_billing_key_secret_id;
      v_pending_secret_id := v_subscription.pending_billing_key_secret_id;
      UPDATE public.spokedu_master_subscriptions
         SET status = 'cancelled',
             period_end = LEAST(COALESCE(period_end, v_now), v_now),
             current_period_end = LEAST(COALESCE(current_period_end, v_now), v_now),
             next_billing_at = NULL,
             cancel_at_period_end = false,
             canceled_at = COALESCE(canceled_at, v_now),
             provider_billing_key_secret_id = NULL,
             pending_billing_key_secret_id = NULL,
             renewal_retry_count = 0,
             last_billing_error = NULL,
             next_retry_at = NULL,
             updated_at = v_now
       WHERE user_id = p_user_id
         AND toss_order_id = p_order_id
         AND toss_payment_key = p_payment_key;
      IF v_previous_secret_id IS NOT NULL THEN
        PERFORM vault.delete_secret(v_previous_secret_id);
      END IF;
      IF v_pending_secret_id IS NOT NULL AND v_pending_secret_id <> v_previous_secret_id THEN
        PERFORM vault.delete_secret(v_pending_secret_id);
      END IF;
    END IF;

    RETURN jsonb_build_object(
      'status', 'processed',
      'cancelled', v_subscription_matches_payment,
      'reason', CASE WHEN v_subscription_matches_payment THEN NULL ELSE 'historical_payment_cancelled' END
    );
  END IF;

  IF p_period_start IS NULL OR p_period_end IS NULL OR p_next_billing_at IS NULL
     OR p_period_end <= p_period_start OR p_next_billing_at <> p_period_end THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'invalid_period');
  END IF;

  IF v_order.status = 'active' THEN
    IF v_subscription_matches_payment AND v_subscription.status = 'active' THEN
      IF p_provider_billing_key_secret_id IS NOT NULL
         AND v_subscription.pending_billing_key_secret_id = p_provider_billing_key_secret_id THEN
        v_previous_secret_id := v_subscription.provider_billing_key_secret_id;
        UPDATE public.spokedu_master_subscriptions
           SET provider_billing_key_secret_id = p_provider_billing_key_secret_id,
               pending_billing_key_secret_id = NULL,
               updated_at = v_now
         WHERE user_id = p_user_id;
        IF v_previous_secret_id IS NOT NULL AND v_previous_secret_id <> p_provider_billing_key_secret_id THEN
          PERFORM vault.delete_secret(v_previous_secret_id);
        END IF;
      END IF;
      RETURN jsonb_build_object(
        'status', 'processed', 'alreadyApplied', true,
        'periodEnd', v_subscription.current_period_end,
        'nextBillingAt', v_subscription.next_billing_at
      );
    END IF;
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'active_order_without_subscription');
  END IF;

  IF p_source = 'renewal' AND v_subscription.user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'subscription_not_found');
  END IF;
  IF p_source = 'renewal'
     AND v_subscription.current_period_start = p_period_start
     AND v_subscription.current_period_end = p_period_end THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'billing_cycle_already_processed');
  END IF;

  IF p_provider_billing_key_secret_id IS NOT NULL THEN
    IF v_subscription.user_id IS NULL
       OR v_subscription.pending_billing_key_secret_id IS DISTINCT FROM p_provider_billing_key_secret_id THEN
      RETURN jsonb_build_object('status', 'rejected', 'reason', 'pending_billing_key_mismatch');
    END IF;
    v_previous_secret_id := v_subscription.provider_billing_key_secret_id;
  END IF;

  INSERT INTO public.spokedu_master_subscriptions (
    user_id, plan, plan_id, status, pg_provider, toss_payment_key, toss_order_id,
    period_start, period_end, current_period_start, current_period_end,
    next_billing_at, cancel_at_period_end, provider_customer_key,
    provider_billing_key_secret_id, pending_billing_key_secret_id,
    provider_billing_key, last_payment_at, current_amount,
    renewal_retry_count, last_billing_error, next_retry_at
  ) VALUES (
    p_user_id, p_plan, p_plan, 'active', 'tosspayments', p_payment_key, p_order_id,
    p_period_start, p_period_end, p_period_start, p_period_end,
    p_next_billing_at, false, p_provider_customer_key,
    p_provider_billing_key_secret_id, NULL,
    NULL, p_period_start, p_amount,
    0, NULL, NULL
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = EXCLUDED.plan,
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
    canceled_at = NULL,
    provider_customer_key = COALESCE(EXCLUDED.provider_customer_key, spokedu_master_subscriptions.provider_customer_key),
    provider_billing_key_secret_id = COALESCE(EXCLUDED.provider_billing_key_secret_id, spokedu_master_subscriptions.provider_billing_key_secret_id),
    pending_billing_key_secret_id = CASE
      WHEN EXCLUDED.provider_billing_key_secret_id IS NOT NULL THEN NULL
      ELSE spokedu_master_subscriptions.pending_billing_key_secret_id
    END,
    provider_billing_key = NULL,
    last_payment_at = EXCLUDED.last_payment_at,
    current_amount = EXCLUDED.current_amount,
    renewal_retry_count = 0,
    last_billing_error = NULL,
    next_retry_at = NULL,
    updated_at = v_now;

  IF v_previous_secret_id IS NOT NULL
     AND v_previous_secret_id <> p_provider_billing_key_secret_id THEN
    PERFORM vault.delete_secret(v_previous_secret_id);
  END IF;

  UPDATE public.spokedu_master_payment_orders
     SET status = 'active', payment_key = p_payment_key,
         billing_cycle_key = COALESCE(p_billing_cycle_key, billing_cycle_key),
         applied_at = COALESCE(applied_at, v_now), last_processed_at = v_now,
         last_error_code = NULL, process_attempts = process_attempts + 1
   WHERE order_id = p_order_id;

  RETURN jsonb_build_object(
    'status', 'processed', 'alreadyApplied', v_event_rows = 0,
    'periodEnd', p_period_end, 'nextBillingAt', p_next_billing_at
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'unique_conflict');
END;
$$;

REVOKE ALL ON FUNCTION public.spokedu_master_apply_payment(
  uuid, text, text, text, integer, timestamptz, timestamptz, timestamptz,
  text, text, text, uuid, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spokedu_master_apply_payment(
  uuid, text, text, text, integer, timestamptz, timestamptz, timestamptz,
  text, text, text, uuid, text
) TO service_role;
