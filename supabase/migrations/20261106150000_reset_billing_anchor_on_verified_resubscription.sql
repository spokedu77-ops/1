-- No backfill and no table/column changes. A newly approved initial order after
-- a paid period has ended starts a new monthly anchor. Renewals, upgrades and
-- replays keep their existing anchor. This is prepared locally, not applied.
CREATE OR REPLACE FUNCTION public._spm_capture_initial_billing_anchor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_local_date date;
  v_first_paid boolean;
  v_resubscription boolean := false;
BEGIN
  v_first_paid := NEW.billing_anchor_day IS NULL
    AND NEW.current_period_start IS NOT NULL
    AND NEW.last_payment_at IS NOT NULL
    AND (TG_OP = 'INSERT' OR OLD.last_payment_at IS NULL);

  IF TG_OP = 'UPDATE'
     AND OLD.last_payment_at IS NOT NULL
     AND OLD.current_period_end IS NOT NULL
     AND NEW.current_period_start >= OLD.current_period_end
     AND NEW.last_payment_at = NEW.current_period_start
     AND NEW.toss_order_id IS DISTINCT FROM OLD.toss_order_id
     AND NEW.toss_payment_key IS DISTINCT FROM OLD.toss_payment_key
     AND NEW.toss_payment_key IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.spokedu_master_payment_orders AS payment_order
       WHERE payment_order.order_id = NEW.toss_order_id
         AND payment_order.user_id = NEW.user_id
         AND payment_order.billing_cycle_key LIKE 'initial:' || NEW.user_id::text || ':%'
         AND payment_order.status IN ('processing', 'recoverable_failed', 'active')
         AND (payment_order.payment_key IS NULL OR payment_order.payment_key = NEW.toss_payment_key)
    ) INTO v_resubscription;
  END IF;

  IF v_first_paid OR v_resubscription THEN
    v_local_date := (NEW.current_period_start AT TIME ZONE 'Asia/Seoul')::date;
    NEW.billing_anchor_day := extract(day FROM v_local_date)::smallint;
    NEW.billing_anchor_is_eom := v_local_date = (date_trunc('month', v_local_date) + interval '1 month - 1 day')::date;
    NEW.billing_anchor_timezone := 'Asia/Seoul';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public._spm_capture_initial_billing_anchor() FROM PUBLIC, anon, authenticated;
