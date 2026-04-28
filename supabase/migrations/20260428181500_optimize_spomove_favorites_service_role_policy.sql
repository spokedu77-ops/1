-- Optimize RLS policy by evaluating auth.role() once per statement.
-- Semantics unchanged: service_role only.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'spomove_favorites'
      AND c.relkind = 'r'
  ) THEN
    ALTER TABLE public.spomove_favorites ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "spomove_favorites_service_role" ON public.spomove_favorites;
    CREATE POLICY "spomove_favorites_service_role"
      ON public.spomove_favorites
      FOR ALL
      USING ((SELECT auth.role()) = 'service_role')
      WITH CHECK ((SELECT auth.role()) = 'service_role');
  END IF;
END
$$;

