-- Ensure recurring SPOKEDU MASTER billing can activate Lite/Premium rows even
-- when an older subscription plan constraint name exists in the database.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'spokedu_master_subscriptions_plan_check'
      AND conrelid = 'public.spokedu_master_subscriptions'::regclass
  ) THEN
    ALTER TABLE public.spokedu_master_subscriptions
      DROP CONSTRAINT spokedu_master_subscriptions_plan_check;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'spm_subscriptions_plan_check'
      AND conrelid = 'public.spokedu_master_subscriptions'::regclass
  ) THEN
    ALTER TABLE public.spokedu_master_subscriptions
      DROP CONSTRAINT spm_subscriptions_plan_check;
  END IF;
END
$$;

ALTER TABLE public.spokedu_master_subscriptions
  ADD CONSTRAINT spm_subscriptions_plan_check
  CHECK (plan IN ('lite', 'premium')) NOT VALID;
