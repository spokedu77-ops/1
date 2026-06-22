-- SPOKEDU MASTER Toss payment webhook idempotency and order ownership.
--
-- The webhook payload does not identify the authenticated app user directly.
-- Checkout stores the order owner first, then the webhook can safely map a
-- verified Toss payment back to the app subscription owner.

CREATE TABLE IF NOT EXISTS public.spokedu_master_payment_orders (
  order_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('pro', 'team')),
  amount integer NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'cancelled', 'failed')),
  payment_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS spm_payment_orders_payment_key_unique
  ON public.spokedu_master_payment_orders (payment_key)
  WHERE payment_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_spm_payment_orders_user_id
  ON public.spokedu_master_payment_orders (user_id);

DROP TRIGGER IF EXISTS spm_payment_orders_updated_at ON public.spokedu_master_payment_orders;
CREATE TRIGGER spm_payment_orders_updated_at
  BEFORE UPDATE ON public.spokedu_master_payment_orders
  FOR EACH ROW
  EXECUTE FUNCTION public._spm_sub_set_updated_at();

ALTER TABLE public.spokedu_master_payment_orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.spokedu_master_payment_webhook_events (
  event_key text PRIMARY KEY,
  event_type text NOT NULL,
  payment_key text,
  order_id text,
  status text NOT NULL DEFAULT 'processed'
    CHECK (status IN ('processed', 'ignored')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spm_payment_webhook_events_created
  ON public.spokedu_master_payment_webhook_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_spm_payment_webhook_events_payment_key
  ON public.spokedu_master_payment_webhook_events (payment_key)
  WHERE payment_key IS NOT NULL;

ALTER TABLE public.spokedu_master_payment_webhook_events ENABLE ROW LEVEL SECURITY;
