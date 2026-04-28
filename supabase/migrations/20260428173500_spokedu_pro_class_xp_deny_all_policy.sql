-- Silence "RLS enabled, no policy" without changing access semantics.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'spokedu_pro_class_xp'
      AND c.relkind = 'r'
  ) THEN
    ALTER TABLE public.spokedu_pro_class_xp ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS spokedu_pro_class_xp_deny_all ON public.spokedu_pro_class_xp;

    CREATE POLICY spokedu_pro_class_xp_deny_all
      ON public.spokedu_pro_class_xp
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END
$$;

