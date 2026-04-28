-- Silence "RLS enabled, no policy" without changing access semantics.
-- This table is intended for service_role usage only (API via getServiceSupabase).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'spokedu_pro_tenant_content'
      AND c.relkind = 'r'
  ) THEN
    ALTER TABLE public.spokedu_pro_tenant_content ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS spokedu_pro_tenant_content_deny_all ON public.spokedu_pro_tenant_content;

    CREATE POLICY spokedu_pro_tenant_content_deny_all
      ON public.spokedu_pro_tenant_content
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END
$$;

