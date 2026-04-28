-- Silence "RLS enabled, no policy" findings without changing access semantics.
-- These tables are intended to be accessed via trusted server roles (service_role) only.
--
-- For each table:
-- - Ensure RLS is enabled
-- - Add/replace a deny-all policy for anon/authenticated

DO $$
DECLARE
  t text;
  policy_name text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'note_collaborators',
    'note_blocks',
    'note_audit_logs',
    'mbt_leads',
    'consultations'
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

