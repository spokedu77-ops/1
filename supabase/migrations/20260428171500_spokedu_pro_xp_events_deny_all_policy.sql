-- Silence "RLS enabled, no policy" without changing access semantics.
-- With RLS enabled, JWT roles should not access this table unless explicitly allowed.
-- We add an explicit deny-all policy for anon/authenticated.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'spokedu_pro_xp_events'
      AND c.relkind = 'r'
  ) THEN
    ALTER TABLE public.spokedu_pro_xp_events ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS xp_events_deny_all ON public.spokedu_pro_xp_events;

    CREATE POLICY xp_events_deny_all
      ON public.spokedu_pro_xp_events
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END
$$;

