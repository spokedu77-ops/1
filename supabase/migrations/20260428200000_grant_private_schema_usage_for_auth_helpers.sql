-- Allow authenticated role to use private auth helper functions referenced by RLS / public wrappers.
-- Minimal grants: USAGE on schema + EXECUTE on specific helper functions if they exist.

DO $$
DECLARE
  fn text;
  r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'private') THEN
    GRANT USAGE ON SCHEMA private TO authenticated;

    FOREACH fn IN ARRAY ARRAY[
      'is_admin',
      'rls_is_admin',
      'is_admin_or_master',
      'current_org_id'
    ]
    LOOP
      FOR r IN
        SELECT
          n.nspname AS schema_name,
          p.proname AS function_name,
          pg_get_function_identity_arguments(p.oid) AS identity_args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'private'
          AND p.proname = fn
      LOOP
        EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated', r.schema_name, r.function_name, r.identity_args);
      END LOOP;
    END LOOP;
  END IF;
END
$$;

