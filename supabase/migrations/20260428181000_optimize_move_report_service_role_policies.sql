-- Optimize RLS policies by evaluating auth.role() once per statement.
-- Semantics unchanged: service_role only.

DO $$
BEGIN
  -- move_report_leads
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='move_report_leads' AND c.relkind='r') THEN
    ALTER TABLE public.move_report_leads ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "service_role_only" ON public.move_report_leads;
    CREATE POLICY "service_role_only" ON public.move_report_leads
      FOR ALL
      USING ((SELECT auth.role()) = 'service_role')
      WITH CHECK ((SELECT auth.role()) = 'service_role');
  END IF;

  -- move_report_submissions
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='move_report_submissions' AND c.relkind='r') THEN
    ALTER TABLE public.move_report_submissions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "move_report_submissions_service_role" ON public.move_report_submissions;
    CREATE POLICY "move_report_submissions_service_role" ON public.move_report_submissions
      FOR ALL
      USING ((SELECT auth.role()) = 'service_role')
      WITH CHECK ((SELECT auth.role()) = 'service_role');
  END IF;

  -- move_report_settings
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='move_report_settings' AND c.relkind='r') THEN
    ALTER TABLE public.move_report_settings ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "move_report_settings_service_role" ON public.move_report_settings;
    CREATE POLICY "move_report_settings_service_role" ON public.move_report_settings
      FOR ALL
      USING ((SELECT auth.role()) = 'service_role')
      WITH CHECK ((SELECT auth.role()) = 'service_role');
  END IF;

  -- move_report_ip_limits
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='move_report_ip_limits' AND c.relkind='r') THEN
    ALTER TABLE public.move_report_ip_limits ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "move_report_ip_limits_service_role" ON public.move_report_ip_limits;
    CREATE POLICY "move_report_ip_limits_service_role" ON public.move_report_ip_limits
      FOR ALL
      USING ((SELECT auth.role()) = 'service_role')
      WITH CHECK ((SELECT auth.role()) = 'service_role');
  END IF;
END
$$;

