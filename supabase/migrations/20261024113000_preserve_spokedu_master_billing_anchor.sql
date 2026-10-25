-- Additive billing-anchor evidence. This migration does not infer anchors for
-- subscriptions that already have a paid period. Those rows remain NULL until
-- a provider-verified backfill is explicitly approved.
ALTER TABLE public.spokedu_master_subscriptions
  ADD COLUMN IF NOT EXISTS billing_anchor_day smallint,
  ADD COLUMN IF NOT EXISTS billing_anchor_is_eom boolean,
  ADD COLUMN IF NOT EXISTS billing_anchor_timezone text;

ALTER TABLE public.spokedu_master_subscriptions
  DROP CONSTRAINT IF EXISTS spm_subscriptions_billing_anchor_day_check;
ALTER TABLE public.spokedu_master_subscriptions
  ADD CONSTRAINT spm_subscriptions_billing_anchor_day_check
  CHECK (billing_anchor_day IS NULL OR billing_anchor_day BETWEEN 1 AND 31);

ALTER TABLE public.spokedu_master_subscriptions
  DROP CONSTRAINT IF EXISTS spm_subscriptions_billing_anchor_complete_check;
ALTER TABLE public.spokedu_master_subscriptions
  ADD CONSTRAINT spm_subscriptions_billing_anchor_complete_check CHECK (
    (billing_anchor_day IS NULL AND billing_anchor_is_eom IS NULL AND billing_anchor_timezone IS NULL)
    OR
    (billing_anchor_day IS NOT NULL AND billing_anchor_is_eom IS NOT NULL AND billing_anchor_timezone = 'Asia/Seoul')
  );

ALTER TABLE public.spokedu_master_payment_orders
  ADD COLUMN IF NOT EXISTS billing_anchor_day smallint;
ALTER TABLE public.spokedu_master_payment_orders
  DROP CONSTRAINT IF EXISTS spm_payment_orders_billing_anchor_day_check;
ALTER TABLE public.spokedu_master_payment_orders
  ADD CONSTRAINT spm_payment_orders_billing_anchor_day_check
  CHECK (billing_anchor_day IS NULL OR billing_anchor_day BETWEEN 1 AND 31);

CREATE OR REPLACE FUNCTION public._spm_capture_initial_billing_anchor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_local_date date;
BEGIN
  -- INSERT covers a newly-created paid subscription. UPDATE covers a pre-created
  -- row whose first paid approval is being applied. last_payment_at, rather
  -- than an existing trial/current period, distinguishes the first paid event.
  -- Existing paid rows and Lite to Premium upgrades keep their original anchor,
  -- including NULL legacy anchors.
  IF NEW.billing_anchor_day IS NULL
     AND NEW.current_period_start IS NOT NULL
     AND NEW.last_payment_at IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.last_payment_at IS NULL) THEN
    v_local_date := (NEW.current_period_start AT TIME ZONE 'Asia/Seoul')::date;
    NEW.billing_anchor_day := extract(day FROM v_local_date)::smallint;
    NEW.billing_anchor_is_eom := v_local_date = (date_trunc('month', v_local_date) + interval '1 month - 1 day')::date;
    NEW.billing_anchor_timezone := 'Asia/Seoul';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public._spm_capture_initial_billing_anchor() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS spm_capture_initial_billing_anchor ON public.spokedu_master_subscriptions;
CREATE TRIGGER spm_capture_initial_billing_anchor
  BEFORE INSERT OR UPDATE OF current_period_start
  ON public.spokedu_master_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public._spm_capture_initial_billing_anchor();

-- Copy only already-verified anchors into future renewal orders. This does not
-- backfill legacy subscription anchors or classify provider transactions.
CREATE OR REPLACE FUNCTION public._spm_copy_renewal_billing_anchor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.billing_anchor_day IS NULL AND NEW.billing_cycle_key IS NOT NULL THEN
    SELECT subscription.billing_anchor_day
      INTO NEW.billing_anchor_day
      FROM public.spokedu_master_subscriptions AS subscription
     WHERE subscription.user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public._spm_copy_renewal_billing_anchor() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS spm_copy_renewal_billing_anchor ON public.spokedu_master_payment_orders;
CREATE TRIGGER spm_copy_renewal_billing_anchor
  BEFORE INSERT ON public.spokedu_master_payment_orders
  FOR EACH ROW EXECUTE FUNCTION public._spm_copy_renewal_billing_anchor();
