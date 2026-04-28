-- Optimize RLS policy by evaluating auth.role() once per statement.
-- Semantics unchanged: service_role only.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'postpone_notices'
      AND c.relkind = 'r'
  ) THEN
    ALTER TABLE public.postpone_notices ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "admin_all" ON public.postpone_notices;
    CREATE POLICY "admin_all" ON public.postpone_notices
      FOR ALL
      USING ((SELECT auth.role()) = 'service_role')
      WITH CHECK ((SELECT auth.role()) = 'service_role');
  END IF;
END
$$;

