-- Silence "RLS enabled, no policy" without changing access semantics.
-- This table is intended for service_role usage only.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'spokedu_pro_stripe_webhook_events'
      AND c.relkind = 'r'
  ) THEN
    ALTER TABLE public.spokedu_pro_stripe_webhook_events ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS stripe_webhook_events_deny_all ON public.spokedu_pro_stripe_webhook_events;

    CREATE POLICY stripe_webhook_events_deny_all
      ON public.spokedu_pro_stripe_webhook_events
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END
$$;

