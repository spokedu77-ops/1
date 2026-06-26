-- Server-owned SPOKEDU MASTER trial entitlement timestamps.

ALTER TABLE public.spokedu_master_subscriptions
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

ALTER TABLE public.spokedu_master_subscriptions
  DROP CONSTRAINT IF EXISTS spm_subscriptions_status_check;

ALTER TABLE public.spokedu_master_subscriptions
  ADD CONSTRAINT spm_subscriptions_status_check
  CHECK (status IN ('trial', 'active', 'expired', 'cancelled', 'canceled', 'pending')) NOT VALID;
