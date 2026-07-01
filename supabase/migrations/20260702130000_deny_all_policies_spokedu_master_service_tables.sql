-- Silence "RLS enabled, no policy" without changing access semantics.
-- These tables are accessed only via service_role (server API / RPC / cron).

DO $$
DECLARE
  t text;
  policy_name text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'spokedu_master_payment_orders',
    'spokedu_master_payment_webhook_events',
    'spokedu_master_spomove_presets'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = t
        AND c.relkind = 'r'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

      policy_name := t || '_deny_all';
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, t);

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
        policy_name,
        t
      );
    END IF;
  END LOOP;
END
$$;
