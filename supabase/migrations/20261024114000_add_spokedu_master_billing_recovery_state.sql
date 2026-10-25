-- Additive state required by the compatible application release. Cron behavior
-- is intentionally unchanged here and transitions in the later 120000 migration.
ALTER TABLE public.spokedu_master_payment_orders
  ADD COLUMN IF NOT EXISTS charge_state text,
  ADD COLUMN IF NOT EXISTS charge_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS operator_review_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recovery_lookup_attempts integer NOT NULL DEFAULT 0;

ALTER TABLE public.spokedu_master_payment_orders
  DROP CONSTRAINT IF EXISTS spokedu_master_payment_orders_charge_state_check;
ALTER TABLE public.spokedu_master_payment_orders
  ADD CONSTRAINT spokedu_master_payment_orders_charge_state_check CHECK (charge_state IN (
    'unattempted', 'request_started', 'outcome_unknown', 'approved_unapplied',
    'applied', 'declined', 'fully_refunded', 'partially_refunded', 'review_required'
  ));

-- Existing NULL rows are classified only from durable local evidence. Anything
-- ambiguous is routed to review and can never become automatically chargeable.
UPDATE public.spokedu_master_payment_orders
   SET charge_state = CASE
     WHEN last_error_code = 'partial_cancel_review_required' THEN 'partially_refunded'
     WHEN status = 'cancelled' THEN 'fully_refunded'
     WHEN status = 'active' AND applied_at IS NOT NULL THEN 'applied'
     WHEN payment_key IS NOT NULL AND applied_at IS NULL THEN 'approved_unapplied'
     WHEN status = 'pending' AND payment_key IS NULL
          AND COALESCE(process_attempts, 0) = 0 AND last_processed_at IS NULL THEN 'unattempted'
     ELSE 'review_required'
   END,
       operator_review_required = CASE
         WHEN last_error_code = 'partial_cancel_review_required' THEN true
         WHEN status = 'active' AND applied_at IS NOT NULL THEN operator_review_required
         WHEN payment_key IS NOT NULL AND applied_at IS NULL THEN operator_review_required
         WHEN status = 'cancelled' THEN operator_review_required
         WHEN status = 'pending' AND payment_key IS NULL
              AND COALESCE(process_attempts, 0) = 0 AND last_processed_at IS NULL THEN operator_review_required
         ELSE true
       END
 WHERE charge_state IS NULL;

ALTER TABLE public.spokedu_master_payment_orders
  ALTER COLUMN charge_state SET DEFAULT 'unattempted',
  ALTER COLUMN charge_state SET NOT NULL;

-- Backward compatibility for the previously deployed RPC/application, which
-- updates status/payment_key/applied_at but does not know charge_state yet.
CREATE OR REPLACE FUNCTION public._spm_sync_legacy_order_charge_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.last_error_code = 'partial_cancel_review_required' THEN
    NEW.charge_state := 'partially_refunded';
    NEW.operator_review_required := true;
  ELSIF NEW.status = 'cancelled' THEN
    NEW.charge_state := 'fully_refunded';
  ELSIF NEW.status = 'active' AND NEW.applied_at IS NOT NULL THEN
    NEW.charge_state := 'applied';
  ELSIF NEW.payment_key IS NOT NULL AND NEW.applied_at IS NULL
        AND NEW.charge_state = 'unattempted' THEN
    NEW.charge_state := 'approved_unapplied';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public._spm_sync_legacy_order_charge_state() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS spm_sync_legacy_order_charge_state ON public.spokedu_master_payment_orders;
CREATE TRIGGER spm_sync_legacy_order_charge_state
  BEFORE INSERT OR UPDATE OF status, payment_key, applied_at, last_error_code
  ON public.spokedu_master_payment_orders
  FOR EACH ROW EXECUTE FUNCTION public._spm_sync_legacy_order_charge_state();

CREATE TABLE IF NOT EXISTS public.spokedu_master_billing_provider_state (
  singleton_key boolean PRIMARY KEY DEFAULT true CHECK (singleton_key),
  status text NOT NULL CHECK (status IN ('unknown', 'configured', 'misconfigured')),
  checked_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.spokedu_master_billing_provider_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.spokedu_master_billing_provider_state FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.spokedu_master_billing_provider_state TO service_role, postgres;

INSERT INTO public.spokedu_master_billing_provider_state (singleton_key, status)
VALUES (true, 'unknown')
ON CONFLICT (singleton_key) DO NOTHING;
