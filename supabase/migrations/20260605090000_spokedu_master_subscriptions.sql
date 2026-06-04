-- SPOKEDU MASTER subscription entitlement table.
--
-- Current commercial model:
-- - This is not an automatic recurring billing system.
-- - Toss one-time card payment confirmation grants a 30-day entitlement.
-- - payment/confirm stores status='active' with period_start/period_end.
-- - Future recurring billing can add billing-key/customer-key columns separately.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.spokedu_master_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  pg_provider text,
  toss_payment_key text,
  toss_order_id text,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.spokedu_master_subscriptions
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS plan text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS pg_provider text,
  ADD COLUMN IF NOT EXISTS toss_payment_key text,
  ADD COLUMN IF NOT EXISTS toss_order_id text,
  ADD COLUMN IF NOT EXISTS period_start timestamptz,
  ADD COLUMN IF NOT EXISTS period_end timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.spokedu_master_subscriptions
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.spokedu_master_subscriptions WHERE id IS NULL) THEN
    ALTER TABLE public.spokedu_master_subscriptions ALTER COLUMN id SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.spokedu_master_subscriptions WHERE user_id IS NULL) THEN
    ALTER TABLE public.spokedu_master_subscriptions ALTER COLUMN user_id SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.spokedu_master_subscriptions WHERE plan IS NULL) THEN
    ALTER TABLE public.spokedu_master_subscriptions ALTER COLUMN plan SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.spokedu_master_subscriptions WHERE status IS NULL) THEN
    ALTER TABLE public.spokedu_master_subscriptions ALTER COLUMN status SET NOT NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'spokedu_master_subscriptions'
      AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE public.spokedu_master_subscriptions
      ADD CONSTRAINT spokedu_master_subscriptions_pkey PRIMARY KEY (id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spm_subscriptions_user_id_fkey'
  ) THEN
    ALTER TABLE public.spokedu_master_subscriptions
      ADD CONSTRAINT spm_subscriptions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spm_subscriptions_plan_check'
  ) THEN
    ALTER TABLE public.spokedu_master_subscriptions
      ADD CONSTRAINT spm_subscriptions_plan_check
      CHECK (plan IN ('free', 'pro', 'team', 'lite')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'spm_subscriptions_status_check'
  ) THEN
    ALTER TABLE public.spokedu_master_subscriptions
      ADD CONSTRAINT spm_subscriptions_status_check
      CHECK (status IN ('active', 'expired', 'cancelled', 'canceled', 'pending')) NOT VALID;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS spm_subscriptions_user_id_unique
  ON public.spokedu_master_subscriptions (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS spm_subscriptions_toss_order_id_unique
  ON public.spokedu_master_subscriptions (toss_order_id)
  WHERE toss_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS spm_subscriptions_toss_payment_key_unique
  ON public.spokedu_master_subscriptions (toss_payment_key)
  WHERE toss_payment_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_spm_subscriptions_user_id
  ON public.spokedu_master_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_spm_subscriptions_status_period_end
  ON public.spokedu_master_subscriptions (status, period_end);

CREATE OR REPLACE FUNCTION public._spm_sub_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS spm_sub_updated_at ON public.spokedu_master_subscriptions;
CREATE TRIGGER spm_sub_updated_at
  BEFORE UPDATE ON public.spokedu_master_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public._spm_sub_set_updated_at();

ALTER TABLE public.spokedu_master_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'spokedu_master_subscriptions'
      AND policyname = 'spm_sub_select_own'
  ) THEN
    CREATE POLICY "spm_sub_select_own"
      ON public.spokedu_master_subscriptions
      FOR SELECT
      USING ((SELECT auth.uid()) = user_id);
  END IF;
END
$$;
